import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Notification {
  id: string;
  event_type: string;
  event_data: Record<string, any>;
  created_at: string;
  read: boolean;
}

// Event type to human-readable message mapping
const EVENT_LABELS: Record<string, (data: Record<string, any>) => string> = {
  'task_created': (d) => `New task: ${d.text || 'Task added'}`,
  'task_completed': (d) => `Task completed: ${d.text || 'Done!'}`,
  'habit_completed': (d) => `Habit checked: ${d.habit_name || 'Habit'}`,
  'transaction_created': (d) => `${d.type === 'income' ? 'Income' : 'Expense'}: ${d.category || ''} ${d.amount ? `($${d.amount})` : ''}`,
  'focus_completed': (d) => `Focus session: ${d.duration_minutes || 0} minutes`,
  'focus_reflection': (d) => `Reflection saved`,
  'journal_created': (d) => `Journal entry saved`,
  'savings_deposit': (d) => `Deposit: ${d.amount ? `$${d.amount}` : 'Added funds'}`,
  'savings_withdrawal': (d) => `Withdrawal: ${d.amount ? `$${d.amount}` : 'Funds withdrawn'}`,
  'goal_created': (d) => `New goal: ${d.goal || 'Goal added'}`,
  'system_message': (d) => d.message || 'System notification',
};

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async (limit = 20) => {
    if (!user) return;

    try {
      // Fetch from activity_feed and treat as notifications
      const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Transform activity feed to notifications
      const notifs: Notification[] = (data || []).map((a: any) => ({
        id: a.id,
        event_type: a.event_type,
        event_data: a.event_data || {},
        created_at: a.created_at,
        read: false, // For now, treat all as unread initially
      }));

      setNotifications(notifs);
      
      // Calculate unread (last 24 hours)
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentCount = notifs.filter(n => n.created_at >= cutoff).length;
      setUnreadCount(recentCount);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getNotificationMessage = useCallback((notification: Notification) => {
    const formatter = EVENT_LABELS[notification.event_type];
    if (formatter) {
      return formatter(notification.event_data);
    }
    return notification.event_type.replace(/_/g, ' ');
  }, []);

  const getTimeAgo = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif: Notification = {
            id: payload.new.id,
            event_type: payload.new.event_type,
            event_data: payload.new.event_data || {},
            created_at: payload.new.created_at,
            read: false,
          };
          setNotifications(prev => [newNotif, ...prev.slice(0, 19)]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    getNotificationMessage,
    getTimeAgo,
    clearNotifications,
    markAllRead,
  };
}
