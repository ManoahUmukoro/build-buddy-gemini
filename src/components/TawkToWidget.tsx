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
    const TAWKTO_ID_REGEX = /^[a-f0-9]{24}\/[a-z0-9]+$/i;
    const TAWKTO_PROPERTY_REGEX = /^[a-f0-9]{24}$/i;
    
    const parts = config.propertyId.split('/');
    const propertyId = parts[0];
    const widgetId = parts[1] || '1';
    
    // Validate property ID format
    if (!TAWKTO_PROPERTY_REGEX.test(propertyId)) {
      console.error('Invalid Tawk.to property ID format');
      return;
    }
    
    // Validate widget ID (alphanumeric only)
    if (!/^[a-z0-9]+$/i.test(widgetId)) {
      console.error('Invalid Tawk.to widget ID format');
      return;
    }

    // Load Tawk.to script - only from whitelisted domain
    const ALLOWED_DOMAIN = 'embed.tawk.to';
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const script = document.createElement('script');
    script.id = 'tawkto-script';
    script.async = true;
    script.src = `https://${ALLOWED_DOMAIN}/${propertyId}/${widgetId}`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');

    document.head.appendChild(script);

    // Set visitor info when available
    if (user && profile) {
      window.Tawk_API.onLoad = function() {
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
