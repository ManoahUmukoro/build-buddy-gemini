import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';

interface AppSettings {
  onboarding_enabled: boolean;
  ai_features_enabled: boolean;
  modules: {
    dashboard: boolean;
    systems: boolean;
    finance: boolean;
    journal: boolean;
    help: boolean;
  };
  pro_features: {
    ai_chat: boolean;
    advanced_analytics: boolean;
    unlimited_entries: boolean;
  };
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    onboarding_enabled: true,
    ai_features_enabled: true,
    modules: {
      dashboard: true,
      systems: true,
      finance: true,
      journal: true,
      help: true,
    },
    pro_features: {
      ai_chat: true,
      advanced_analytics: true,
      unlimited_entries: true,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap: Record<string, any> = {};
      data?.forEach(item => {
        settingsMap[item.key] = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
      });

      setSettings({
        onboarding_enabled: settingsMap.onboarding_enabled ?? true,
        ai_features_enabled: settingsMap.ai_features_enabled ?? true,
        modules: settingsMap.modules ?? settings.modules,
        pro_features: settingsMap.pro_features ?? settings.pro_features,
      });
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);

      const updates = [
        { key: 'onboarding_enabled', value: settings.onboarding_enabled },
        { key: 'ai_features_enabled', value: settings.ai_features_enabled },
        { key: 'modules', value: settings.modules },
        { key: 'pro_features', value: settings.pro_features },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('admin_settings')
          .update({ value: update.value })
          .eq('key', update.key);

        if (error) throw error;
      }

      toast.success('Settings saved successfully');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">App Settings</h1>
            <p className="text-muted-foreground">Configure application features and modules</p>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Control core app features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="onboarding">User Onboarding</Label>
                  <p className="text-sm text-muted-foreground">Show onboarding tour for new users</p>
                </div>
                <Switch
                  id="onboarding"
                  checked={settings.onboarding_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, onboarding_enabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ai">AI Features</Label>
                  <p className="text-sm text-muted-foreground">Enable AI command center globally</p>
                </div>
                <Switch
                  id="ai"
                  checked={settings.ai_features_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, ai_features_enabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Module Access</CardTitle>
              <CardDescription>Enable or disable app modules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(settings.modules).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key} className="capitalize">{key}</Label>
                  <Switch
                    id={key}
                    checked={value}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        modules: { ...settings.modules, [key]: checked }
                      })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pro Features</CardTitle>
              <CardDescription>Features available only to Pro users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(settings.pro_features).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={key} className="capitalize">{key.replace(/_/g, ' ')}</Label>
                  </div>
                  <Switch
                    id={key}
                    checked={value}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        pro_features: { ...settings.pro_features, [key]: checked }
                      })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
