import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Bell, Plus, Edit2, Trash2, Clock, Save, 
  Loader2, Play, Pause, Zap, Info
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NotificationTrigger {
  id: string;
  name: string;
  trigger_type: string;
  message_title: string;
  message_body: string;
  condition: Record<string, unknown>;
  schedule_time: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const TRIGGER_TYPES = [
  { value: 'inactivity', label: 'User Inactivity', description: 'Trigger when user hasn\'t been active for X hours', conditionLabel: 'Hours Inactive', conditionKey: 'hours_inactive', defaultValue: 24 },
  { value: 'no_transactions', label: 'No Transactions', description: 'Trigger when no transactions logged today', conditionLabel: null, conditionKey: null, defaultValue: null },
  { value: 'no_tasks_tomorrow', label: 'No Tasks Tomorrow', description: 'Trigger when user has no tasks planned for tomorrow', conditionLabel: null, conditionKey: null, defaultValue: null },
  { value: 'low_savings', label: 'Low Savings Progress', description: 'Trigger when savings goals are below threshold %', conditionLabel: 'Threshold %', conditionKey: 'threshold_percent', defaultValue: 50 },
  { value: 'habit_streak_at_risk', label: 'Habit Streak at Risk', description: 'Trigger when habits haven\'t been completed by a certain hour', conditionLabel: 'After Hour (24h)', conditionKey: 'threshold_hour', defaultValue: 18 },
  { value: 'budget_exceeded', label: 'Budget Exceeded', description: 'Trigger when any budget category is exceeded', conditionLabel: null, conditionKey: null, defaultValue: null },
  { value: 'goal_achieved', label: 'Goal Achieved', description: 'Trigger when a savings goal is reached (100%)', conditionLabel: null, conditionKey: null, defaultValue: null },
  { value: 'broadcast', label: 'Broadcast Message', description: 'Send to all users at scheduled time', conditionLabel: null, conditionKey: null, defaultValue: null },
];

export default function AdminNotifications() {
  const [triggers, setTriggers] = useState<NotificationTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTrigger, setEditingTrigger] = useState<NotificationTrigger | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testingTrigger, setTestingTrigger] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    trigger_type: string;
    message_title: string;
    message_body: string;
    condition: Record<string, number>;
    schedule_time: string;
    is_active: boolean;
  }>({
    name: '',
    trigger_type: 'inactivity',
    message_title: '',
    message_body: '',
    condition: { hours_inactive: 24 },
    schedule_time: '',
    is_active: true,
  });

  const fetchTriggers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notification_triggers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const typedData = (data || []).map(t => ({
        ...t,
        condition: (t.condition || {}) as Record<string, unknown>,
      })) as NotificationTrigger[];
      setTriggers(typedData);
    } catch (error) {
      console.error('Error fetching triggers:', error);
      toast.error('Failed to load notification triggers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTriggers();
  }, [fetchTriggers]);

  const handleOpenModal = (trigger?: NotificationTrigger) => {
    if (trigger) {
      setEditingTrigger(trigger);
      const typeInfo = getTriggerTypeInfo(trigger.trigger_type);
      const conditionValue = typeInfo.conditionKey 
        ? (trigger.condition as Record<string, unknown>)[typeInfo.conditionKey] as number || typeInfo.defaultValue
        : null;
      
      setFormData({
        name: trigger.name,
        trigger_type: trigger.trigger_type,
        message_title: trigger.message_title,
        message_body: trigger.message_body,
        condition: typeInfo.conditionKey ? { [typeInfo.conditionKey]: conditionValue } : {},
        schedule_time: trigger.schedule_time || '',
        is_active: trigger.is_active,
      });
    } else {
      setEditingTrigger(null);
      setFormData({
        name: '',
        trigger_type: 'inactivity',
        message_title: '',
        message_body: '',
        condition: { hours_inactive: 24 },
        schedule_time: '',
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.message_title || !formData.message_body) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      if (editingTrigger) {
        const { error } = await supabase
          .from('notification_triggers')
          .update({
            name: formData.name,
            trigger_type: formData.trigger_type,
            message_title: formData.message_title,
            message_body: formData.message_body,
            condition: formData.condition,
            schedule_time: formData.schedule_time || null,
            is_active: formData.is_active,
          })
          .eq('id', editingTrigger.id);

        if (error) throw error;
        toast.success('Trigger updated successfully');
      } else {
        const { error } = await supabase
          .from('notification_triggers')
          .insert({
            name: formData.name,
            trigger_type: formData.trigger_type,
            message_title: formData.message_title,
            message_body: formData.message_body,
            condition: formData.condition,
            schedule_time: formData.schedule_time || null,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success('Trigger created successfully');
      }

      setIsModalOpen(false);
      fetchTriggers();
    } catch (error) {
      console.error('Error saving trigger:', error);
      toast.error('Failed to save trigger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trigger?')) return;

    try {
      const { error } = await supabase
        .from('notification_triggers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Trigger deleted');
      fetchTriggers();
    } catch (error) {
      console.error('Error deleting trigger:', error);
      toast.error('Failed to delete trigger');
    }
  };

  const handleToggleActive = async (trigger: NotificationTrigger) => {
    try {
      const { error } = await supabase
        .from('notification_triggers')
        .update({ is_active: !trigger.is_active })
        .eq('id', trigger.id);

      if (error) throw error;
      
      setTriggers(prev => prev.map(t => 
        t.id === trigger.id ? { ...t, is_active: !t.is_active } : t
      ));
      
      toast.success(trigger.is_active ? 'Trigger paused' : 'Trigger activated');
    } catch (error) {
      console.error('Error toggling trigger:', error);
      toast.error('Failed to update trigger');
    }
  };

  const handleTestTrigger = async () => {
    setTestingTrigger('cron');
    try {
      const { data, error } = await supabase.functions.invoke('notification-cron', {
        body: { test: true }
      });
      
      if (error) throw error;
      
      toast.success(`Notification cron executed: ${data?.notifications_sent || 0} notifications sent`);
    } catch (error: any) {
      console.error('Error testing trigger:', error);
      toast.error(error.message || 'Failed to test notification cron');
    } finally {
      setTestingTrigger(null);
    }
  };

  const getTriggerTypeInfo = (type: string) => 
    TRIGGER_TYPES.find(t => t.value === type) || TRIGGER_TYPES[0];

  const handleTriggerTypeChange = (type: string) => {
    const typeInfo = TRIGGER_TYPES.find(t => t.value === type);
    const newCondition = typeInfo?.conditionKey 
      ? { [typeInfo.conditionKey]: typeInfo.defaultValue }
      : {};
    
    setFormData(prev => ({
      ...prev,
      trigger_type: type,
      condition: newCondition,
    }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="text-primary" />
              Notification Manager
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Configure automated notification triggers for users
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleTestTrigger}
              disabled={testingTrigger === 'cron'}
            >
              {testingTrigger === 'cron' ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Zap size={16} className="mr-2" />
              )}
              Test Now
            </Button>
            <Button onClick={() => handleOpenModal()} className="shrink-0">
              <Plus size={16} className="mr-2" />
              Add Trigger
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="text-primary mt-0.5 shrink-0" size={18} />
            <div className="text-sm">
              <p className="font-medium text-foreground">How it works</p>
              <p className="text-muted-foreground mt-1">
                Notifications are checked every 30 minutes. When a trigger condition is met, 
                a notification is sent to the user's inbox. Each user only receives one notification 
                per trigger type per day.
              </p>
            </div>
          </div>
        </div>

        {/* Triggers List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : triggers.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Bell className="mx-auto text-muted-foreground mb-4" size={48} />
            <h3 className="font-semibold text-lg mb-2">No Notification Triggers</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create triggers to automatically notify users based on their activity
            </p>
            <Button onClick={() => handleOpenModal()}>
              <Plus size={16} className="mr-2" />
              Create First Trigger
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {triggers.map((trigger) => {
              const typeInfo = getTriggerTypeInfo(trigger.trigger_type);
              return (
                <div 
                  key={trigger.id}
                  className={`bg-card border rounded-xl p-4 ${
                    trigger.is_active ? 'border-border' : 'border-border/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold truncate">{trigger.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          trigger.is_active 
                            ? 'bg-success/20 text-success' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {trigger.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm text-muted-foreground mb-2 cursor-help">
                              {typeInfo.label}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{typeInfo.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm font-medium">{trigger.message_title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {trigger.message_body}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {trigger.schedule_time && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            Scheduled: {trigger.schedule_time}
                          </span>
                        )}
                        {typeInfo.conditionKey && trigger.condition[typeInfo.conditionKey] && (
                          <span className="flex items-center gap-1">
                            {typeInfo.conditionLabel}: {String(trigger.condition[typeInfo.conditionKey])}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(trigger)}
                        title={trigger.is_active ? 'Pause' : 'Activate'}
                      >
                        {trigger.is_active ? <Pause size={16} /> : <Play size={16} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenModal(trigger)}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(trigger.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit/Create Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingTrigger ? 'Edit Notification Trigger' : 'Create Notification Trigger'}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Trigger Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., 3-Day Inactivity Reminder"
              />
            </div>

            <div>
              <Label htmlFor="trigger_type">Trigger Type</Label>
              <select
                id="trigger_type"
                value={formData.trigger_type}
                onChange={(e) => handleTriggerTypeChange(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {TRIGGER_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {getTriggerTypeInfo(formData.trigger_type).description}
              </p>
            </div>

            {getTriggerTypeInfo(formData.trigger_type).conditionKey && (
              <div>
                <Label htmlFor="condition_value">
                  {getTriggerTypeInfo(formData.trigger_type).conditionLabel}
                </Label>
                <Input
                  id="condition_value"
                  type="number"
                  min="1"
                  value={formData.condition[getTriggerTypeInfo(formData.trigger_type).conditionKey!] as number || ''}
                  onChange={(e) => {
                    const key = getTriggerTypeInfo(formData.trigger_type).conditionKey!;
                    setFormData(prev => ({ 
                      ...prev, 
                      condition: { [key]: parseInt(e.target.value) || 0 }
                    }));
                  }}
                />
              </div>
            )}

            <div>
              <Label htmlFor="message_title">Message Title *</Label>
              <Input
                id="message_title"
                value={formData.message_title}
                onChange={(e) => setFormData(prev => ({ ...prev, message_title: e.target.value }))}
                placeholder="We miss you!"
              />
            </div>

            <div>
              <Label htmlFor="message_body">Message Body *</Label>
              <Textarea
                id="message_body"
                value={formData.message_body}
                onChange={(e) => setFormData(prev => ({ ...prev, message_body: e.target.value }))}
                placeholder="It's been a while since you last logged in..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="schedule_time">Schedule Time (Optional)</Label>
              <Input
                id="schedule_time"
                type="time"
                value={formData.schedule_time}
                onChange={(e) => setFormData(prev => ({ ...prev, schedule_time: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to trigger whenever the condition is met
              </p>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <span className="text-sm font-medium">Active</span>
                <p className="text-xs text-muted-foreground">
                  Enable this trigger to start sending notifications
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} className="mr-2" />}
                {editingTrigger ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
