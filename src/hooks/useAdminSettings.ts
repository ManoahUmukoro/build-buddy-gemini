import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MaintenanceConfig {
  enabled: boolean;
  message: string;
}

export interface ModulesConfig {
  dashboard: boolean;
  systems: boolean;
  finance: boolean;
  journal: boolean;
  help: boolean;
  savings: boolean;
}

interface AppSettings {
  maintenance_mode: MaintenanceConfig;
  modules: ModulesConfig;
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
  maintenance_mode: {
    enabled: false,
    message: 'We are currently performing maintenance. Please check back soon.',
  },
  modules: {
    dashboard: true,
    systems: true,
    finance: true,
    journal: true,
    help: true,
    savings: true,
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
        settingsMap[item.key] = item.value;
      });

      // Parse maintenance_mode as JSON object { enabled, message }
      const maintenanceConfig = settingsMap.maintenance_mode;
      const parsedMaintenance: MaintenanceConfig = 
        maintenanceConfig && typeof maintenanceConfig === 'object'
          ? { enabled: maintenanceConfig.enabled ?? false, message: maintenanceConfig.message ?? '' }
          : defaultSettings.maintenance_mode;

      // Parse modules config
      const modulesConfig = settingsMap.modules;
      const parsedModules: ModulesConfig = 
        modulesConfig && typeof modulesConfig === 'object'
          ? { 
              dashboard: modulesConfig.dashboard ?? true,
              systems: modulesConfig.systems ?? true,
              finance: modulesConfig.finance ?? true,
              journal: modulesConfig.journal ?? true,
              help: modulesConfig.help ?? true,
              savings: modulesConfig.savings ?? true,
            }
          : defaultSettings.modules;

      setSettings({
        maintenance_mode: parsedMaintenance,
        modules: parsedModules,
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
    isModuleEnabled: (module: keyof ModulesConfig) => settings.modules[module],
    isFeatureEnabled: (feature: keyof AppSettings['features']) => settings.features[feature],
    isMaintenanceMode: settings.maintenance_mode.enabled,
    maintenanceMessage: settings.maintenance_mode.message,
    modules: settings.modules,
    refetch: fetchSettings,
  };
}
