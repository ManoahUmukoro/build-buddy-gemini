import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Loader2, Settings, Bell, Shield, ToggleLeft, Megaphone, Plus, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface MaintenanceConfig {
  enabled: boolean;
  message: string;
}

interface AppSettings {
  maintenance_mode: MaintenanceConfig;
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

interface Announcement {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  priority: number;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<AppSettings>({
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
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [settingsRes, announcementsRes] = await Promise.all([
        supabase.from('admin_settings').select('key, value'),
        supabase.from('announcements').select('*').order('priority'),
      ]);

      if (settingsRes.error) throw settingsRes.error;
      if (announcementsRes.error) throw announcementsRes.error;

      const settingsMap: Record<string, any> = {};
      settingsRes.data?.forEach(item => {
        // Value is already parsed by Supabase - no need for JSON.parse
        settingsMap[item.key] = item.value;
      });

      // Handle maintenance_mode as a JSON object { enabled, message }
      const maintenanceConfig = settingsMap.maintenance_mode;
      const parsedMaintenance: MaintenanceConfig = 
        maintenanceConfig && typeof maintenanceConfig === 'object'
          ? { enabled: maintenanceConfig.enabled ?? false, message: maintenanceConfig.message ?? '' }
          : { enabled: false, message: 'We are currently performing maintenance. Please check back soon.' };

      setSettings({
        maintenance_mode: parsedMaintenance,
        modules: settingsMap.modules ?? settings.modules,
        notifications: settingsMap.notifications ?? settings.notifications,
        features: settingsMap.features ?? settings.features,
      });

      setAnnouncements(announcementsRes.data || []);
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
        { key: 'maintenance_mode', value: settings.maintenance_mode },
        { key: 'modules', value: settings.modules },
        { key: 'notifications', value: settings.notifications },
        { key: 'features', value: settings.features },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('admin_settings')
          .upsert({ 
            key: update.key, 
            value: JSON.parse(JSON.stringify(update.value)),
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });

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

  async function addAnnouncement() {
    if (!newAnnouncement.title || !newAnnouncement.message) {
      toast.error('Please fill in title and message');
      return;
    }

    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          title: newAnnouncement.title,
          message: newAnnouncement.message,
          is_active: true,
          priority: announcements.length + 1,
        });

      if (error) throw error;
      toast.success('Announcement added');
      setNewAnnouncement({ title: '', message: '' });
      fetchData();
    } catch (err) {
      console.error('Error adding announcement:', err);
      toast.error('Failed to add announcement');
    }
  }

  async function toggleAnnouncement(id: string, is_active: boolean) {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Error updating announcement:', err);
      toast.error('Failed to update announcement');
    }
  }

  async function deleteAnnouncement(id: string) {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Announcement deleted');
      fetchData();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      toast.error('Failed to delete announcement');
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
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">App Settings</h1>
            <p className="text-sm text-muted-foreground">Configure features, maintenance, and notifications</p>
          </div>
          <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save All Settings
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto gap-1 p-1">
            <TabsTrigger value="general" className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm">
              <Settings className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm">
              <ToggleLeft className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Modules</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm">
              <Shield className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Features</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm">
              <Bell className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm col-span-3 sm:col-span-1">
              <Megaphone className="h-4 w-4" />
              <span>Announce</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Mode</CardTitle>
                <CardDescription>Put the app in maintenance mode to block user access</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="maintenance">Enable Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">Users will see a maintenance message instead of the app</p>
                  </div>
                  <Switch
                    id="maintenance"
                    checked={settings.maintenance_mode.enabled}
                    onCheckedChange={(checked) => setSettings({ 
                      ...settings, 
                      maintenance_mode: { ...settings.maintenance_mode, enabled: checked } 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance-msg">Maintenance Message</Label>
                  <Input
                    id="maintenance-msg"
                    value={settings.maintenance_mode.message}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      maintenance_mode: { ...settings.maintenance_mode, message: e.target.value } 
                    })}
                    placeholder="We are currently performing maintenance..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules">
            <Card>
              <CardHeader>
                <CardTitle>Module Access</CardTitle>
                <CardDescription>Enable or disable app modules for all users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(settings.modules).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <Label htmlFor={key} className="capitalize">{key}</Label>
                      <p className="text-sm text-muted-foreground">
                        {key === 'dashboard' && 'Task management and weekly planner'}
                        {key === 'systems' && 'Goals and habit tracking'}
                        {key === 'finance' && 'Budget and expense tracking'}
                        {key === 'journal' && 'Daily reflections and mood tracking'}
                        {key === 'help' && 'Help center and documentation'}
                      </p>
                    </div>
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
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>AI & Pro Features</CardTitle>
                <CardDescription>Toggle advanced features globally</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(settings.features).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <Label htmlFor={key} className="capitalize">{key.replace(/_/g, ' ')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {key === 'ai_chat' && 'AI-powered chat assistant'}
                        {key === 'receipt_scanning' && 'Scan receipts to add transactions'}
                        {key === 'auto_categorize' && 'Auto-categorize expenses with AI'}
                        {key === 'habit_suggestions' && 'AI habit suggestions for goals'}
                      </p>
                    </div>
                    <Switch
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) => 
                        setSettings({
                          ...settings,
                          features: { ...settings.features, [key]: checked }
                        })
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure default notification settings for users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(settings.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <Label htmlFor={key} className="capitalize">{key.replace(/_/g, ' ')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {key === 'email_enabled' && 'Allow sending emails to users'}
                        {key === 'push_enabled' && 'Enable browser push notifications'}
                        {key === 'task_reminders' && 'Send task reminder notifications'}
                        {key === 'weekly_digest' && 'Send weekly summary emails'}
                        {key === 'marketing_emails' && 'Send promotional emails'}
                      </p>
                    </div>
                    <Switch
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) => 
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, [key]: checked }
                        })
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Announcement</CardTitle>
                  <CardDescription>Announcements appear in the Help Center ticker</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ann-title">Title</Label>
                      <Input
                        id="ann-title"
                        placeholder="e.g., New Feature"
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ann-message">Message</Label>
                      <Input
                        id="ann-message"
                        placeholder="e.g., AI chat is now available!"
                        value={newAnnouncement.message}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={addAnnouncement}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Announcement
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Active Announcements</CardTitle>
                  <CardDescription>Manage existing announcements</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Mobile Card View */}
                  <div className="block sm:hidden space-y-3">
                    {announcements.length === 0 ? (
                      <p className="text-center text-muted-foreground py-6">No announcements yet.</p>
                    ) : (
                      announcements.map((ann) => (
                        <div key={ann.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{ann.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{ann.message}</p>
                            </div>
                            <Badge variant={ann.is_active ? 'default' : 'secondary'} className="flex-shrink-0 text-xs">
                              {ann.is_active ? 'Active' : 'Off'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-border">
                            <Switch
                              checked={ann.is_active}
                              onCheckedChange={(checked) => toggleAnnouncement(ann.id, checked)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAnnouncement(ann.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {announcements.map((ann) => (
                          <TableRow key={ann.id}>
                            <TableCell className="font-medium">{ann.title}</TableCell>
                            <TableCell className="max-w-xs truncate">{ann.message}</TableCell>
                            <TableCell>
                              <Badge variant={ann.is_active ? 'default' : 'secondary'}>
                                {ann.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Switch
                                checked={ann.is_active}
                                onCheckedChange={(checked) => toggleAnnouncement(ann.id, checked)}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteAnnouncement(ann.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {announcements.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              No announcements yet. Add one above.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
