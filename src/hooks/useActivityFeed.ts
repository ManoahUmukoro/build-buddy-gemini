import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ActivityEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: Record<string, any>;
  related_table: string | null;
  related_id: string | null;
  created_at: string;
}

export function useActivityFeed() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async (limit = 50) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setActivities((data || []) as ActivityEvent[]);
    } catch (err) {
      console.error('Failed to fetch activity feed:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getTodayActivities = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return activities.filter(a => a.created_at.startsWith(today));
  }, [activities]);

  const getActivitiesByType = useCallback((eventType: string) => {
    return activities.filter(a => a.event_type === eventType);
  }, [activities]);

  const getRecentActivities = useCallback((hours = 24) => {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    return activities.filter(a => a.created_at >= cutoff);
  }, [activities]);

  // Manual activity logging (for events not covered by triggers)
  const logActivity = useCallback(async (
    eventType: string,
    eventData: Record<string, any>,
    relatedTable?: string,
    relatedId?: string
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('activity_feed')
        .insert({
          user_id: user.id,
          event_type: eventType,
          event_data: eventData,
          related_table: relatedTable || null,
          related_id: relatedId || null,
        });

      if (error) throw error;
      
      // Refresh activities
      fetchActivities();
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  }, [user, fetchActivities]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    fetchActivities();

    const channel = supabase
      .channel('activity-feed-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setActivities(prev => [payload.new as ActivityEvent, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchActivities]);

  return {
    activities,
    loading,
    fetchActivities,
    getTodayActivities,
    getActivitiesByType,
    getRecentActivities,
    logActivity,
  };
}
