import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

interface SupportWidgetConfig {
  enabled: boolean;
  provider: string;
  propertyId: string;
}

declare global {
  interface Window {
    Tawk_API?: any;
    Tawk_LoadStart?: Date;
  }
}

export function TawkToWidget() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [config, setConfig] = useState<SupportWidgetConfig | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'support_widget')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching support widget config:', error);
          return;
        }

        if (data?.value) {
          setConfig(data.value as unknown as SupportWidgetConfig);
        }
      } catch (err) {
        console.error('Error fetching support widget config:', err);
      }
    }

    fetchConfig();

    // Subscribe to changes
    const channel = supabase
      .channel('support-widget-config')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_settings',
          filter: 'key=eq.support_widget',
        },
        () => {
          fetchConfig();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!config?.enabled || !config?.propertyId || config.provider !== 'tawkto') {
      // Remove existing script if disabled
      const existingScript = document.getElementById('tawkto-script');
      if (existingScript) {
        existingScript.remove();
        // Clean up Tawk API
        if (window.Tawk_API) {
          try {
            window.Tawk_API.hideWidget?.();
          } catch (e) {
            // Ignore errors
          }
        }
      }
      return;
    }

    // Prevent duplicate scripts
    if (document.getElementById('tawkto-script')) {
      return;
    }

    // Validate and extract widget ID from property ID
    // Tawk.to property IDs should be alphanumeric with format: propertyId/widgetId
    // Property ID is 24 hex characters, widget ID starts with "1" followed by alphanumeric
    const parts = config.propertyId.trim().split('/');
    const propertyId = parts[0]?.trim();
    // Default widget ID is typically "1i..." or "default" format for default widget
    const widgetId = parts[1]?.trim() || 'default';
    
    // More flexible validation - just check if we have a reasonable property ID
    if (!propertyId || propertyId.length < 20) {
      console.error('Invalid Tawk.to property ID format. Expected 24 character hex string, got:', propertyId);
      console.info('Hint: Get your Property ID from Tawk.to Dashboard → Administration → Channels → Chat Widget');
      return;
    }

    // Load Tawk.to script - only from whitelisted domain
    const ALLOWED_DOMAIN = 'embed.tawk.to';
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const script = document.createElement('script');
    script.id = 'tawkto-script';
    script.async = true;
    // Use the standard Tawk.to embed URL format
    script.src = `https://${ALLOWED_DOMAIN}/${propertyId}/${widgetId}`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    
    // Add load/error handlers for debugging
    script.onload = () => {
      console.log('Tawk.to script loaded successfully');
    };
    
    script.onerror = (e) => {
      console.error('Tawk.to script failed to load:', e);
    };

    document.head.appendChild(script);

    // Set visitor info when available
    if (user && profile) {
      window.Tawk_API.onLoad = function() {
        console.log('Tawk.to widget loaded');
        window.Tawk_API?.setAttributes?.({
          name: profile.display_name || 'User',
          email: user.email || '',
          id: user.id,
        }, function(error: any) {
          if (error) {
            console.log('Tawk.to setAttributes error:', error);
          }
        });
      };
    }

    return () => {
      const scriptEl = document.getElementById('tawkto-script');
      if (scriptEl) {
        scriptEl.remove();
      }
    };
  }, [config, user, profile]);

  // This component doesn't render anything visible
  return null;
}
