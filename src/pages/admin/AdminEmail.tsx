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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Loader2, Plus, Edit, Mail, Send, Settings, FileText, CheckCircle, AlertCircle, Play, Trash2, Users, Eye, Clock } from 'lucide-react';

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

interface UserProfile {
  user_id: string;
  display_name: string;
}

interface EmailSchedule {
  daily_digest_time: string;
  weekly_checkin_day: string;
  weekly_checkin_time: string;
}

// Protected templates that cannot be deleted
const PROTECTED_SLUGS = ['daily_digest', 'weekly_checkin', 'welcome_user', 'task_reminder'];

// Variable reference organized by category
const VARIABLE_REFERENCE = {
  personal: [
    { var: '{{name}}', desc: "User's display name" },
    { var: '{{email}}', desc: "User's email address" },
    { var: '{{greeting}}', desc: 'Time-appropriate greeting (Good Morning/Afternoon/Evening)' },
  ],
  datetime: [
    { var: '{{date}}', desc: "Today's date (formatted)" },
    { var: '{{day_of_week}}', desc: 'Current day name' },
  ],
  tasks: [
    { var: '{{tasks_count}}', desc: 'Pending tasks for today' },
    { var: '{{tasks_completed}}', desc: 'Completed tasks today' },
    { var: '{{tasks_total}}', desc: 'Total tasks for today' },
  ],
  habits: [
    { var: '{{habits_count}}', desc: 'Pending habits for today' },
    { var: '{{habits_completed}}', desc: 'Completed habits today' },
  ],
  finance: [
    { var: '{{balance}}', desc: 'Current account balance' },
    { var: '{{weekly_income}}', desc: 'Income this week' },
    { var: '{{weekly_expense}}', desc: 'Expenses this week' },
    { var: '{{net_savings}}', desc: 'Net savings (income - expense)' },
    { var: '{{savings_goal}}', desc: 'Active savings goal name' },
    { var: '{{savings_progress}}', desc: 'Savings goal progress %' },
  ],
  journal: [
    { var: '{{mood_trend}}', desc: 'Recent mood trend description' },
    { var: '{{journal_count}}', desc: 'Journal entries this week' },
  ],
  links: [
    { var: '{{app_url}}', desc: 'Link to LifeOS app' },
    { var: '{{reset_link}}', desc: 'Password reset link (password reset only)' },
  ],
  specific: [
    { var: '{{task_name}}', desc: 'Task name (task reminder only)' },
    { var: '{{task_time}}', desc: 'Task due time (task reminder only)' },
    { var: '{{feature_name}}', desc: 'Feature name (announcements only)' },
  ],
};

const DEFAULT_TEMPLATES = [
  { name: 'Welcome Email', slug: 'welcome_user', subject: '{{greeting}}, {{name}}! Welcome to LifeOS 🎉', body: '<h2>{{greeting}}, {{name}}!</h2><p>Welcome to LifeOS! We\'re excited to have you on board.</p><p>Get started by:</p><ol><li>Setting up your first system and habits</li><li>Adding your budget categories</li><li>Creating your first journal entry</li></ol><p>If you have any questions, our help center is always available.</p><p>Best,<br/>The LifeOS Team</p>' },
  { name: 'Daily Digest', slug: 'daily_digest', subject: '{{greeting}}, {{name}}! Your LifeOS Daily Summary 📋', body: '<h2>{{greeting}}, {{name}}!</h2><p>Here\'s your daily summary for {{date}}:</p><p>📋 <strong>Tasks:</strong> {{tasks_count}} pending ({{tasks_completed}} completed)</p><p>✅ <strong>Habits:</strong> {{habits_count}} remaining</p><p>💰 <strong>Balance:</strong> {{balance}}</p><p>{{mood_trend}}</p><p><a href="{{app_url}}">Open LifeOS</a></p>' },
  { name: 'Weekly Check-in', slug: 'weekly_checkin', subject: 'Your Weekly LifeOS Summary 📊', body: '<h2>{{greeting}}, {{name}}!</h2><p>Here\'s your weekly summary:</p><p>📋 Tasks Completed: {{tasks_completed}}/{{tasks_total}}</p><p>✅ Habits Tracked: {{habits_completed}}</p><p>📖 Journal Entries: {{journal_count}}</p><p>💰 Net Savings: {{net_savings}}</p><p>{{mood_trend}}</p><p>Keep up the great work!</p>' },
  { name: 'Task Reminder', slug: 'task_reminder', subject: '⏰ Reminder: {{task_name}}', body: '<h2>{{greeting}}, {{name}}!</h2><p>You have a task scheduled for <strong>{{task_time}}</strong>:</p><div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0;"><strong>{{task_name}}</strong></div><p>Stay focused and make it happen! 💪</p>' },
];

export default function AdminEmail() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [config, setConfig] = useState<EmailConfig>({ 
    from_email: '', 
    from_name: 'LifeOS',
    resend_configured: false,
    reply_to: ''
  });
  const [schedule, setSchedule] = useState<EmailSchedule>({
    daily_digest_time: '08:00',
    weekly_checkin_day: 'sunday',
    weekly_checkin_time: '18:00',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState<string>('');
  const [sendingIndividual, setSendingIndividual] = useState(false);
  
  // Trigger states
  const [triggeringDigest, setTriggeringDigest] = useState(false);
  const [triggeringWeekly, setTriggeringWeekly] = useState(false);
  const [triggeringWelcome, setTriggeringWelcome] = useState(false);
  const [triggeringTaskReminder, setTriggeringTaskReminder] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [templatesRes, configRes, scheduleRes, usersRes] = await Promise.all([
        supabase.from('email_templates').select('*').order('name'),
        supabase.from('admin_settings').select('value').eq('key', 'email_config').single(),
        supabase.from('admin_settings').select('value').eq('key', 'email_schedule').single(),
        supabase.from('profiles').select('user_id, display_name').order('display_name'),
      ]);

      if (templatesRes.error) throw templatesRes.error;
      setTemplates(templatesRes.data || []);

      if (configRes.data?.value) {
        const parsed = typeof configRes.data.value === 'string' 
          ? JSON.parse(configRes.data.value) 
          : configRes.data.value;
        setConfig({ ...config, ...parsed });
      }

      if (scheduleRes.data?.value) {
        const parsed = typeof scheduleRes.data.value === 'string' 
          ? JSON.parse(scheduleRes.data.value) 
          : scheduleRes.data.value;
        setSchedule({ ...schedule, ...parsed });
      }

      if (usersRes.data) {
        setUsers(usersRes.data);
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

  async function saveSchedule() {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('admin_settings')
        .upsert({ 
          key: 'email_schedule', 
          value: JSON.parse(JSON.stringify(schedule)),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      toast.success('Schedule saved');
    } catch (err) {
      console.error('Error saving schedule:', err);
      toast.error('Failed to save schedule');
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
          displayName: 'Test User'
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

  async function sendIndividualEmail() {
    if (!selectedUserId || !selectedTemplateSlug) {
      toast.error('Please select a user and template');
      return;
    }

    try {
      setSendingIndividual(true);
      const { data, error } = await supabase.functions.invoke('admin-send-email', {
        body: { 
          user_id: selectedUserId,
          template_slug: selectedTemplateSlug,
        }
      });

      if (error) throw error;
      toast.success(`Email sent to ${data?.sent_to || 'user'}`);
    } catch (err: any) {
      console.error('Error sending individual email:', err);
      toast.error(err.message || 'Failed to send email');
    } finally {
      setSendingIndividual(false);
    }
  }

  async function saveTemplate() {
    if (!editTemplate) return;

    try {
      setSaving(true);
      
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
      setPreviewMode(false);
      fetchData();
    } catch (err) {
      console.error('Error saving template:', err);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id: string, slug: string | null) {
    if (slug && PROTECTED_SLUGS.includes(slug)) {
      toast.error('This template is required by the system and cannot be deleted');
      return;
    }

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Template deleted');
      fetchData();
    } catch (err) {
      console.error('Error deleting template:', err);
      toast.error('Failed to delete template');
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

  async function triggerWelcomeEmail() {
    if (!testEmail) {
      toast.error('Please enter a test email in the Test Email tab first');
      return;
    }
    setTriggeringWelcome(true);
    try {
      const { error } = await supabase.functions.invoke('welcome-user', {
        body: { email: testEmail, displayName: 'Test User' }
      });
      if (error) throw error;
      toast.success('Welcome email sent!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send welcome email');
    } finally {
      setTriggeringWelcome(false);
    }
  }

  async function triggerTaskReminder() {
    if (!testEmail) {
      toast.error('Please enter a test email in the Test Email tab first');
      return;
    }
    setTriggeringTaskReminder(true);
    try {
      const { error } = await supabase.functions.invoke('send-task-reminder', {
        body: { 
          userEmail: testEmail, 
          userName: 'Test User',
          taskText: 'Sample Task Reminder',
          taskTime: '14:00'
        }
      });
      if (error) throw error;
      toast.success('Task reminder sent!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send task reminder');
    } finally {
      setTriggeringTaskReminder(false);
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

  // Preview with sample data
  function getPreviewHtml(body: string): string {
    const sampleVars: Record<string, string> = {
      name: 'John Doe',
      email: 'john@example.com',
      greeting: 'Good Morning',
      date: 'Friday, January 3, 2025',
      day_of_week: 'Friday',
      tasks_count: '5',
      tasks_completed: '3',
      tasks_total: '8',
      habits_count: '2',
      habits_completed: '4',
      balance: '$1,250.00',
      weekly_income: '$2,000.00',
      weekly_expense: '$750.00',
      net_savings: '+$1,250.00',
      savings_goal: 'Emergency Fund',
      savings_progress: '45%',
      mood_trend: 'Feeling great! 🌟',
      journal_count: '5',
      app_url: 'https://app.lifeos.com',
      reset_link: '#',
      task_name: 'Review quarterly goals',
      task_time: '2:00 PM',
      feature_name: 'AI Assistant',
    };

    let preview = body;
    for (const [key, value] of Object.entries(sampleVars)) {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return preview;
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
          <p className="text-muted-foreground">Configure email settings, templates, and scheduling</p>
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="compose" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Compose</span>
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Test</span>
            </TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
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

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
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
                    <Dialog open={dialogOpen} onOpenChange={(open) => {
                      setDialogOpen(open);
                      if (!open) {
                        setPreviewMode(false);
                        setEditTemplate(null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => setEditTemplate({ id: '', name: '', slug: null, subject: '', body: '', is_active: true })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center justify-between">
                            <span>{editTemplate?.id ? 'Edit Template' : 'New Template'}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPreviewMode(!previewMode)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {previewMode ? 'Edit' : 'Preview'}
                            </Button>
                          </DialogTitle>
                        </DialogHeader>
                        
                        {previewMode ? (
                          <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg">
                              <p className="text-sm font-medium">Subject Preview:</p>
                              <p className="text-sm">{getPreviewHtml(editTemplate?.subject || '')}</p>
                            </div>
                            <div className="border rounded-lg p-4">
                              <p className="text-sm font-medium mb-2">Body Preview:</p>
                              <div 
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: getPreviewHtml(editTemplate?.body || '') }}
                              />
                            </div>
                          </div>
                        ) : (
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
                              <Label htmlFor="template-body">Body (HTML)</Label>
                              <Textarea
                                id="template-body"
                                rows={10}
                                value={editTemplate?.body || ''}
                                onChange={(e) => setEditTemplate(prev => prev ? { ...prev, body: e.target.value } : null)}
                              />
                            </div>
                            
                            {/* Variable Reference Accordion */}
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="variables">
                                <AccordionTrigger className="text-sm">Available Variables</AccordionTrigger>
                                <AccordionContent>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    {Object.entries(VARIABLE_REFERENCE).map(([category, vars]) => (
                                      <div key={category}>
                                        <p className="font-semibold capitalize mb-1">{category}</p>
                                        <ul className="space-y-0.5">
                                          {vars.map(v => (
                                            <li key={v.var} className="flex gap-2">
                                              <code className="bg-muted px-1 rounded">{v.var}</code>
                                              <span className="text-muted-foreground">{v.desc}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>

                            <div className="flex items-center gap-2">
                              <Switch
                                id="template-active"
                                checked={editTemplate?.is_active || false}
                                onCheckedChange={(checked) => setEditTemplate(prev => prev ? { ...prev, is_active: checked } : null)}
                              />
                              <Label htmlFor="template-active">Active</Label>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                          <Button onClick={saveTemplate} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Save
                          </Button>
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
                          <div className="flex justify-end gap-1">
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
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  disabled={template.slug ? PROTECTED_SLUGS.includes(template.slug) : false}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{template.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteTemplate(template.id, template.slug)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
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
            
            {/* Manual Triggers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Manual Triggers
                </CardTitle>
                <CardDescription>Manually trigger email functions for testing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={triggerDailyDigest}
                    disabled={triggeringDigest}
                    className="flex-col h-auto py-3"
                  >
                    {triggeringDigest ? <Loader2 className="h-4 w-4 mb-1 animate-spin" /> : <Play className="h-4 w-4 mb-1" />}
                    <span className="text-xs">Daily Digest</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={triggerWeeklyCheckin}
                    disabled={triggeringWeekly}
                    className="flex-col h-auto py-3"
                  >
                    {triggeringWeekly ? <Loader2 className="h-4 w-4 mb-1 animate-spin" /> : <Play className="h-4 w-4 mb-1" />}
                    <span className="text-xs">Weekly Check-in</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={triggerWelcomeEmail}
                    disabled={triggeringWelcome}
                    className="flex-col h-auto py-3"
                  >
                    {triggeringWelcome ? <Loader2 className="h-4 w-4 mb-1 animate-spin" /> : <Play className="h-4 w-4 mb-1" />}
                    <span className="text-xs">Welcome Email</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={triggerTaskReminder}
                    disabled={triggeringTaskReminder}
                    className="flex-col h-auto py-3"
                  >
                    {triggeringTaskReminder ? <Loader2 className="h-4 w-4 mb-1 animate-spin" /> : <Play className="h-4 w-4 mb-1" />}
                    <span className="text-xs">Task Reminder</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Note: Welcome Email and Task Reminder require a test email address (set in Test tab)
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Email Schedule
                </CardTitle>
                <CardDescription>Configure when automated emails are sent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold">Daily Digest</h3>
                    <div className="space-y-2">
                      <Label htmlFor="daily-time">Send Time</Label>
                      <Input
                        id="daily-time"
                        type="time"
                        value={schedule.daily_digest_time}
                        onChange={(e) => setSchedule({ ...schedule, daily_digest_time: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold">Weekly Check-in</h3>
                    <div className="space-y-2">
                      <Label htmlFor="weekly-day">Day</Label>
                      <Select 
                        value={schedule.weekly_checkin_day} 
                        onValueChange={(value) => setSchedule({ ...schedule, weekly_checkin_day: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sunday">Sunday</SelectItem>
                          <SelectItem value="monday">Monday</SelectItem>
                          <SelectItem value="tuesday">Tuesday</SelectItem>
                          <SelectItem value="wednesday">Wednesday</SelectItem>
                          <SelectItem value="thursday">Thursday</SelectItem>
                          <SelectItem value="friday">Friday</SelectItem>
                          <SelectItem value="saturday">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weekly-time">Send Time</Label>
                      <Input
                        id="weekly-time"
                        type="time"
                        value={schedule.weekly_checkin_time}
                        onChange={(e) => setSchedule({ ...schedule, weekly_checkin_time: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={saveSchedule} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Schedule
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compose Tab */}
          <TabsContent value="compose">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Send to Individual User
                </CardTitle>
                <CardDescription>Send a template email to a specific user</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select User</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Select Template</Label>
                    <Select value={selectedTemplateSlug} onValueChange={setSelectedTemplateSlug}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.filter(t => t.slug && t.is_active).map(template => (
                          <SelectItem key={template.id} value={template.slug!}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={sendIndividualEmail} 
                  disabled={sendingIndividual || !selectedUserId || !selectedTemplateSlug}
                >
                  {sendingIndividual ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Email
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Tab */}
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
                  <p className="text-xs text-muted-foreground">
                    This email is also used for Welcome Email and Task Reminder triggers
                  </p>
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
