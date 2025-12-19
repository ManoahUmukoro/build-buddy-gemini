import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AppSettings {
  maintenance_mode: boolean;
  maintenance_message: string;
  modules: {
    dashboard: boolean;
    systems: boolean;
    finance: boolean;
    journal: boolean;
    help: boolean;
  };
  notifications: {
    email_enabled: boolean;
    push_enabled: boolean;
    task_reminders: boolean;
    weekly_digest: boolean;
    marketing_emails: boolean;
  };
  features: {
    ai_chat: boolean;
    receipt_scanning: boolean;
    auto_categorize: boolean;
    habit_suggestions: boolean;
  };
}

const defaultSettings: AppSettings = {
  maintenance_mode: false,
  maintenance_message: 'We are currently performing maintenance. Please check back soon.',
  modules: {
    dashboard: true,
    systems: true,
    finance: true,
    journal: true,
    help: true,
  },
  notifications: {
    email_enabled: true,
    push_enabled: true,
    task_reminders: true,
    weekly_digest: true,
    marketing_emails: false,
  },
  features: {
    ai_chat: true,
    receipt_scanning: true,
    auto_categorize: true,
    habit_suggestions: true,
  },
};

export function useAdminSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap: Record<string, any> = {};
      data?.forEach(item => {
        // Value is already parsed by Supabase - no need for JSON.parse
        settingsMap[item.key] = item.value;
      });

      setSettings({
        maintenance_mode: settingsMap.maintenance_mode ?? defaultSettings.maintenance_mode,
        maintenance_message: settingsMap.maintenance_message ?? defaultSettings.maintenance_message,
        modules: settingsMap.modules ?? defaultSettings.modules,
        notifications: settingsMap.notifications ?? defaultSettings.notifications,
        features: settingsMap.features ?? defaultSettings.features,
      });
    } catch (err) {
      console.error('Error fetching admin settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_settings',
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  return {
    settings,
    loading,
    isModuleEnabled: (module: keyof AppSettings['modules']) => settings.modules[module],
    isFeatureEnabled: (feature: keyof AppSettings['features']) => settings.features[feature],
    isMaintenanceMode: settings.maintenance_mode,
    maintenanceMessage: settings.maintenance_message,
    refetch: fetchSettings,
  };
}
