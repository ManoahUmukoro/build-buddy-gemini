import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Save, Loader2, Plus, Edit, Mail } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  is_active: boolean;
}

interface EmailConfig {
  from_email: string;
  from_name: string;
}

export default function AdminEmail() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [config, setConfig] = useState<EmailConfig>({ from_email: '', from_name: 'LifeOS' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
        setConfig(parsed);
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
        .update({ value: JSON.parse(JSON.stringify(config)) })
        .eq('key', 'email_config');

      if (error) throw error;
      toast.success('Email configuration saved');
    } catch (err) {
      console.error('Error saving config:', err);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  async function saveTemplate() {
    if (!editTemplate) return;

    try {
      setSaving(true);
      
      if (editTemplate.id) {
        const { error } = await supabase
          .from('email_templates')
          .update({
            name: editTemplate.name,
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
          <p className="text-muted-foreground">Manage email configuration and templates</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Email Configuration</CardTitle>
            <CardDescription>Configure sender information for outgoing emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            </div>
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Configuration
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>Manage email templates for user communications</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    onClick={() => setEditTemplate({ id: '', name: '', subject: '', body: '', is_active: true })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editTemplate?.id ? 'Edit Template' : 'New Template'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input
                        id="template-name"
                        value={editTemplate?.name || ''}
                        onChange={(e) => setEditTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                      />
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
                        rows={8}
                        value={editTemplate?.body || ''}
                        onChange={(e) => setEditTemplate(prev => prev ? { ...prev, body: e.target.value } : null)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use &#123;&#123;name&#125;&#125;, &#123;&#123;email&#125;&#125;, etc. for dynamic content
                      </p>
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
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{template.subject}</TableCell>
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
                          setEditTemplate(template);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
