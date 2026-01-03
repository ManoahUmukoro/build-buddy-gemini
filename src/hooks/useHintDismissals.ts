import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useHintDismissals() {
  const { user } = useAuth();
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchDismissals = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_hint_dismissals')
        .select('hint_id')
        .eq('user_id', user.id);

      if (error) throw error;
      
      setDismissedHints(new Set(data?.map(d => d.hint_id) || []));
    } catch (err) {
      console.error('Error fetching hint dismissals:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDismissals();
  }, [fetchDismissals]);

  const isDismissed = (hintId: string): boolean => {
    return dismissedHints.has(hintId);
  };

  const dismiss = async (hintId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_hint_dismissals')
        .insert({ user_id: user.id, hint_id: hintId });

      if (error) {
        // Ignore duplicate errors
        if (!error.message.includes('duplicate')) {
          throw error;
        }
      }
      
      setDismissedHints(prev => new Set([...prev, hintId]));
      return true;
    } catch (err) {
      console.error('Error dismissing hint:', err);
      return false;
    }
  };

  const resetHints = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_hint_dismissals')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      setDismissedHints(new Set());
      return true;
    } catch (err) {
      console.error('Error resetting hints:', err);
      return false;
    }
  };

  return {
    loading,
    isDismissed,
    dismiss,
    resetHints,
    refetch: fetchDismissals,
  };
}
