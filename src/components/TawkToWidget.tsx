import { useEffect, useState, useRef } from 'react';
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

// Detect iOS Safari
function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS/.test(ua);
  return iOS && webkit && notChrome;
}

export function TawkToWidget() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [config, setConfig] = useState<SupportWidgetConfig | null>(null);
  const loadAttemptedRef = useRef(false);
  const [loadError, setLoadError] = useState(false);

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
    if (document.getElementById('tawkto-script') || loadAttemptedRef.current) {
      return;
    }

    // On iOS Safari, Tawk.to may be blocked by privacy settings
    // We'll try to load it but suppress errors silently
    const isIOS = isIOSSafari();

    // Validate and extract widget ID from property ID
    const parts = config.propertyId.trim().split('/');
    const propertyId = parts[0]?.trim();
    const widgetId = parts[1]?.trim() || 'default';
    
    if (!propertyId || propertyId.length < 20) {
      console.error('Invalid Tawk.to property ID format');
      return;
    }

    loadAttemptedRef.current = true;

    // Load Tawk.to script
    const ALLOWED_DOMAIN = 'embed.tawk.to';
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    // Set up error handling before loading
    window.Tawk_API.onLoadError = function() {
      setLoadError(true);
      // Silently handle - don't show error toast on iOS
      if (!isIOS) {
        console.log('Tawk.to failed to load - may be blocked by privacy settings');
      }
    };

    const script = document.createElement('script');
    script.id = 'tawkto-script';
    script.async = true;
    script.src = `https://${ALLOWED_DOMAIN}/${propertyId}/${widgetId}`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    
    script.onload = () => {
      if (!loadError) {
        console.log('Tawk.to script loaded successfully');
      }
    };
    
    script.onerror = () => {
      setLoadError(true);
      // Silently fail on iOS - don't show any error to user
      if (!isIOS) {
        console.log('Tawk.to blocked by browser privacy settings');
      }
      // Remove the failed script
      script.remove();
    };

    document.head.appendChild(script);

    // Set visitor info when available
    if (user && profile) {
      window.Tawk_API.onLoad = function() {
        window.Tawk_API?.setAttributes?.({
          name: profile.display_name || 'User',
          email: user.email || '',
          id: user.id,
        }, function(error: any) {
          // Silently handle errors
        });
      };
    }

    return () => {
      const scriptEl = document.getElementById('tawkto-script');
      if (scriptEl) {
        scriptEl.remove();
      }
    };
  }, [config, user, profile, loadError]);

  // This component doesn't render anything visible
  return null;
}
