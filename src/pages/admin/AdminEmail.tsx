import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Loader2, Plus, Edit, Mail, Send, Settings, FileText, CheckCircle, AlertCircle, Play } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  slug: string | null;
  subject: string;
  body: string;
  is_active: boolean;
}

interface EmailConfig {
  from_email: string;
  from_name: string;
  resend_configured: boolean;
  reply_to: string;
}

const DEFAULT_TEMPLATES = [
  { name: 'Welcome Email', subject: 'Welcome to LifeOS! 🎉', body: 'Hi {{name}},\n\nWelcome to LifeOS! We\'re excited to have you on board.\n\nGet started by:\n1. Setting up your first system and habits\n2. Adding your budget categories\n3. Creating your first journal entry\n\nIf you have any questions, our help center is always available.\n\nBest,\nThe LifeOS Team' },
  { name: 'Password Reset', subject: 'Reset your LifeOS password', body: 'Hi {{name}},\n\nWe received a request to reset your password. Click the link below to set a new password:\n\n{{reset_link}}\n\nIf you didn\'t request this, you can safely ignore this email.\n\nBest,\nThe LifeOS Team' },
  { name: 'Task Reminder', subject: 'Reminder: {{task_name}} is due soon', body: 'Hi {{name}},\n\nThis is a friendly reminder that your task "{{task_name}}" is due at {{task_time}}.\n\nDon\'t forget to check it off when you\'re done!\n\nBest,\nLifeOS' },
  { name: 'Weekly Digest', subject: 'Your Weekly LifeOS Summary 📊', body: 'Hi {{name}},\n\nHere\'s your weekly summary:\n\n📋 Tasks Completed: {{tasks_completed}}\n✅ Habits Tracked: {{habits_completed}}\n📖 Journal Entries: {{journal_entries}}\n💰 Net Savings: {{net_savings}}\n\nKeep up the great work!\n\nBest,\nThe LifeOS Team' },
  { name: 'New Feature Announcement', subject: 'New Feature: {{feature_name}} is here! ✨', body: 'Hi {{name}},\n\nWe\'re excited to announce a new feature: {{feature_name}}!\n\n{{feature_description}}\n\nLog in to try it out today.\n\nBest,\nThe LifeOS Team' },
];

export default function AdminEmail() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [config, setConfig] = useState<EmailConfig>({ 
    from_email: '', 
    from_name: 'LifeOS',
    resend_configured: false,
    reply_to: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [triggeringDigest, setTriggeringDigest] = useState(false);
  const [triggeringWeekly, setTriggeringWeekly] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [templatesRes, configRes] = await Promise.all([
        supabase.from('email_templates').select('*').order('name'),
        supabase.from('admin_settings').select('value').eq('key', 'email_config').single(),
      ]);

      if (templatesRes.error) throw templatesRes.error;
      setTemplates(templatesRes.data || []);

      if (configRes.data?.value) {
        const parsed = typeof configRes.data.value === 'string' 
          ? JSON.parse(configRes.data.value) 
          : configRes.data.value;
        setConfig({ ...config, ...parsed });
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load email settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('admin_settings')
        .upsert({ 
          key: 'email_config', 
          value: JSON.parse(JSON.stringify(config)),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      toast.success('Email configuration saved');
    } catch (err) {
      console.error('Error saving config:', err);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  async function sendTestEmail() {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    try {
      setTesting(true);
      const { error } = await supabase.functions.invoke('welcome-user', {
        body: { 
          email: testEmail,
          name: 'Test User'
        }
      });

      if (error) throw error;
      toast.success('Test email sent successfully!');
    } catch (err: any) {
      console.error('Error sending test email:', err);
      toast.error(err.message || 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  }

  async function saveTemplate() {
    if (!editTemplate) return;

    try {
      setSaving(true);
      
      // Auto-generate slug from name if not provided
      const slug = editTemplate.slug || editTemplate.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      
      if (editTemplate.id) {
        const { error } = await supabase
          .from('email_templates')
          .update({
            name: editTemplate.name,
            slug: slug,
            subject: editTemplate.subject,
            body: editTemplate.body,
            is_active: editTemplate.is_active,
          })
          .eq('id', editTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert({
            name: editTemplate.name,
            slug: slug,
            subject: editTemplate.subject,
            body: editTemplate.body,
            is_active: editTemplate.is_active,
          });

        if (error) throw error;
      }

      toast.success('Template saved');
      setDialogOpen(false);
      setEditTemplate(null);
      fetchData();
    } catch (err) {
      console.error('Error saving template:', err);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  async function triggerDailyDigest() {
    setTriggeringDigest(true);
    try {
      const { error } = await supabase.functions.invoke('daily-digest', {
        body: { test: true }
      });
      if (error) throw error;
      toast.success('Daily Digest triggered successfully!');
    } catch (err: any) {
      console.error('Error triggering daily digest:', err);
      toast.error(err.message || 'Failed to trigger daily digest');
    } finally {
      setTriggeringDigest(false);
    }
  }

  async function triggerWeeklyCheckin() {
    setTriggeringWeekly(true);
    try {
      const { error } = await supabase.functions.invoke('weekly-checkin', {
        body: { test: true }
      });
      if (error) throw error;
      toast.success('Weekly Check-in triggered successfully!');
    } catch (err: any) {
      console.error('Error triggering weekly check-in:', err);
      toast.error(err.message || 'Failed to trigger weekly check-in');
    } finally {
      setTriggeringWeekly(false);
    }
  }

  async function createDefaultTemplates() {
    try {
      setSaving(true);
      const templatesWithDefaults = DEFAULT_TEMPLATES.map(t => ({
        ...t,
        is_active: true
      }));

      const { error } = await supabase
        .from('email_templates')
        .insert(templatesWithDefaults);

      if (error) throw error;
      toast.success('Default templates created');
      fetchData();
    } catch (err) {
      console.error('Error creating templates:', err);
      toast.error('Failed to create templates');
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email & Notifications</h1>
          <p className="text-muted-foreground">Configure email settings, templates, and Resend integration</p>
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configuration</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Test Email</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Resend Configuration
                </CardTitle>
                <CardDescription>Configure your Resend email settings. Make sure RESEND_API_KEY is set in secrets.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  {config.resend_configured ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-sm">Resend API is configured</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm">RESEND_API_KEY needs to be set in Supabase secrets</span>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from-email">From Email</Label>
                    <Input
                      id="from-email"
                      type="email"
                      placeholder="noreply@yourdomain.com"
                      value={config.from_email}
                      onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Must be a verified domain in Resend</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="from-name">From Name</Label>
                    <Input
                      id="from-name"
                      placeholder="LifeOS"
                      value={config.from_name}
                      onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reply-to">Reply-To Email</Label>
                    <Input
                      id="reply-to"
                      type="email"
                      placeholder="support@yourdomain.com"
                      value={config.reply_to}
                      onChange={(e) => setConfig({ ...config, reply_to: e.target.value })}
                    />
                  </div>
                </div>

                <Button onClick={saveConfig} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle>Email Templates</CardTitle>
                    <CardDescription>Manage email templates for user communications</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {templates.length === 0 && (
                      <Button variant="outline" size="sm" onClick={createDefaultTemplates} disabled={saving}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Default Templates
                      </Button>
                    )}
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => setEditTemplate({ id: '', name: '', slug: null, subject: '', body: '', is_active: true })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{editTemplate?.id ? 'Edit Template' : 'New Template'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="template-name">Template Name</Label>
                              <Input
                                id="template-name"
                                value={editTemplate?.name || ''}
                                onChange={(e) => setEditTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="template-slug">Slug (for edge functions)</Label>
                              <Input
                                id="template-slug"
                                placeholder="auto_generated_from_name"
                                value={editTemplate?.slug || ''}
                                onChange={(e) => setEditTemplate(prev => prev ? { ...prev, slug: e.target.value } : null)}
                              />
                              <p className="text-xs text-muted-foreground">Used by edge functions to find templates</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="template-subject">Subject</Label>
                            <Input
                              id="template-subject"
                              value={editTemplate?.subject || ''}
                              onChange={(e) => setEditTemplate(prev => prev ? { ...prev, subject: e.target.value } : null)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="template-body">Body</Label>
                            <Textarea
                              id="template-body"
                              rows={10}
                              value={editTemplate?.body || ''}
                              onChange={(e) => setEditTemplate(prev => prev ? { ...prev, body: e.target.value } : null)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Available variables: {`{{name}}, {{email}}, {{task_name}}, {{task_time}}, {{reset_link}}, {{feature_name}}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id="template-active"
                              checked={editTemplate?.is_active || false}
                              onCheckedChange={(checked) => setEditTemplate(prev => prev ? { ...prev, is_active: checked } : null)}
                            />
                            <Label htmlFor="template-active">Active</Label>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button onClick={saveTemplate} disabled={saving}>
                              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                              Save
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          {template.slug ? (
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{template.slug}</code>
                          ) : (
                            <span className="text-xs text-warning">Not set</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{template.subject}</TableCell>
                        <TableCell>
                          <Badge variant={template.is_active ? 'default' : 'secondary'}>
                            {template.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditTemplate({ ...template, slug: template.slug || null });
                              setDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {templates.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No templates yet. Click "Create Default Templates" to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            {/* Manual Trigger Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Manual Triggers
                </CardTitle>
                <CardDescription>Manually trigger scheduled email functions for testing</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button 
                  variant="outline" 
                  onClick={triggerDailyDigest}
                  disabled={triggeringDigest}
                >
                  {triggeringDigest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Test Daily Digest
                </Button>
                <Button 
                  variant="outline" 
                  onClick={triggerWeeklyCheckin}
                  disabled={triggeringWeekly}
                >
                  {triggeringWeekly ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Test Weekly Check-in
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Send Test Email
                </CardTitle>
                <CardDescription>Test your email configuration by sending a welcome email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-email">Recipient Email</Label>
                  <Input
                    id="test-email"
                    type="email"
                    placeholder="your-email@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>
                <Button onClick={sendTestEmail} disabled={testing}>
                  {testing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Test Email
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
