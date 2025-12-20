import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SavingsEntry {
  id: string;
  user_id: string;
  savings_goal_id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  note: string | null;
  date: string;
  created_at: string;
}

export function useSavingsEntries(goalId?: string) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<SavingsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('savings_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (goalId) {
        query = query.eq('savings_goal_id', goalId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setEntries((data || []) as SavingsEntry[]);
    } catch (err) {
      console.error('Error fetching savings entries:', err);
    } finally {
      setLoading(false);
    }
  }, [user, goalId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addEntry = async (entry: Omit<SavingsEntry, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('savings_entries')
        .insert({
          user_id: user.id,
          savings_goal_id: entry.savings_goal_id,
          type: entry.type,
          amount: entry.amount,
          note: entry.note,
          date: entry.date,
        })
        .select()
        .single();

      if (error) throw error;
      
      setEntries(prev => [data as SavingsEntry, ...prev]);
      return data as SavingsEntry;
    } catch (err) {
      console.error('Error adding savings entry:', err);
      return null;
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('savings_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setEntries(prev => prev.filter(e => e.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting savings entry:', err);
      return false;
    }
  };

  return {
    entries,
    loading,
    addEntry,
    deleteEntry,
    refetch: fetchEntries,
  };
}
