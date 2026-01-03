import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface TutorialProgress {
  tutorial_id: string;
  current_step: number;
  is_completed: boolean;
}

export function useTutorial(tutorialId: string) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<TutorialProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  const fetchProgress = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_tutorial_progress')
        .select('tutorial_id, current_step, is_completed')
        .eq('user_id', user.id)
        .eq('tutorial_id', tutorialId)
        .maybeSingle();

      if (error) throw error;
      
      setProgress(data as TutorialProgress | null);
    } catch (err) {
      console.error('Error fetching tutorial progress:', err);
    } finally {
      setLoading(false);
    }
  }, [user, tutorialId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const startTutorial = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_tutorial_progress')
        .upsert({
          user_id: user.id,
          tutorial_id: tutorialId,
          current_step: 0,
          is_completed: false,
        }, {
          onConflict: 'user_id,tutorial_id',
        });

      if (error) throw error;
      
      setProgress({ tutorial_id: tutorialId, current_step: 0, is_completed: false });
      setIsRunning(true);
      return true;
    } catch (err) {
      console.error('Error starting tutorial:', err);
      return false;
    }
  };

  const updateStep = async (step: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_tutorial_progress')
        .update({ current_step: step })
        .eq('user_id', user.id)
        .eq('tutorial_id', tutorialId);

      if (error) throw error;
      
      setProgress(prev => prev ? { ...prev, current_step: step } : null);
      return true;
    } catch (err) {
      console.error('Error updating tutorial step:', err);
      return false;
    }
  };

  const completeTutorial = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_tutorial_progress')
        .update({ 
          is_completed: true, 
          completed_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .eq('tutorial_id', tutorialId);

      if (error) throw error;
      
      setProgress(prev => prev ? { ...prev, is_completed: true } : null);
      setIsRunning(false);
      return true;
    } catch (err) {
      console.error('Error completing tutorial:', err);
      return false;
    }
  };

  const resetTutorial = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_tutorial_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('tutorial_id', tutorialId);

      if (error) throw error;
      
      setProgress(null);
      return true;
    } catch (err) {
      console.error('Error resetting tutorial:', err);
      return false;
    }
  };

  return {
    loading,
    progress,
    isCompleted: progress?.is_completed ?? false,
    currentStep: progress?.current_step ?? 0,
    isRunning,
    setIsRunning,
    startTutorial,
    updateStep,
    completeTutorial,
    resetTutorial,
    refetch: fetchProgress,
  };
}
