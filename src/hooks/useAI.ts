import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIRequestOptions {
  type: string;
  messages?: Array<{ role: string; content: string }>;
  context?: Record<string, any>;
}

export function useAI() {
  const callAI = async ({ type, messages, context }: AIRequestOptions): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: { type, messages, context }
      });

      if (error) {
        console.error('AI call error:', error);
        if (error.message?.includes('429')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (error.message?.includes('402')) {
          toast.error('AI credits depleted. Please add credits to continue.');
        } else {
          toast.error('AI request failed. Please try again.');
        }
        return null;
      }

      return data?.content || null;
    } catch (error) {
      console.error('AI request error:', error);
      toast.error('AI request failed. Please try again.');
      return null;
    }
  };

  const smartSort = async (tasks: Array<{ id: number; text: string; done: boolean }>) => {
    const result = await callAI({
      type: 'smart-sort',
      context: { tasks }
    });
    
    if (result) {
      try {
        return JSON.parse(result);
      } catch {
        return null;
      }
    }
    return null;
  };

  const breakdownTask = async (taskText: string) => {
    const result = await callAI({
      type: 'task-breakdown',
      context: { taskText }
    });
    
    if (result) {
      try {
        return JSON.parse(result);
      } catch {
        // Try to extract subtasks from text
        const lines = result.split('\n').filter(l => l.trim());
        return lines.map(text => ({ text: text.replace(/^[\d\.\-\*\•]+\s*/, '') }));
      }
    }
    return null;
  };

  const smartDraft = async (taskText: string) => {
    return await callAI({
      type: 'smart-draft',
      context: { taskText }
    });
  };

  const lifeAudit = async (context: {
    completedHabits: number;
    totalHabits: number;
    balance: number;
    totalTasks: number;
    journalCount: number;
  }) => {
    return await callAI({
      type: 'life-audit',
      context
    });
  };

  const dailyBriefing = async (context: {
    todayTasks: number;
    habitsToComplete: number;
    balance: number;
  }) => {
    return await callAI({
      type: 'daily-briefing',
      context
    });
  };

  const analyzeFinances = async (context: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    expenseData: Array<{ name: string; value: number }>;
  }) => {
    return await callAI({
      type: 'finance-analysis',
      context
    });
  };

  const financeChat = async (messages: Array<{ role: string; content: string }>) => {
    return await callAI({
      type: 'finance-chat',
      messages
    });
  };

  const journalChat = async (messages: Array<{ role: string; content: string }>) => {
    return await callAI({
      type: 'journal-chat',
      messages
    });
  };

  const autoCategorize = async (description: string, categories: string[]) => {
    return await callAI({
      type: 'auto-categorize',
      context: { description, categories }
    });
  };

  const generateSchedule = async (prompt: string) => {
    const result = await callAI({
      type: 'generate-schedule',
      context: { prompt }
    });
    
    if (result) {
      try {
        return JSON.parse(result);
      } catch {
        const lines = result.split('\n').filter(l => l.trim());
        return lines.map(text => ({ text: text.replace(/^[\d\.\-\*\•]+\s*/, '') }));
      }
    }
    return null;
  };

  const generateHabits = async (goal: string, why: string) => {
    const result = await callAI({
      type: 'generate-habits',
      context: { goal, why }
    });
    
    if (result) {
      try {
        return JSON.parse(result);
      } catch {
        const lines = result.split('\n').filter(l => l.trim());
        return lines.map(name => ({ name: name.replace(/^[\d\.\-\*\•]+\s*/, '') }));
      }
    }
    return null;
  };

  const weeklyReport = async (entries: Array<{ mood: number; win: string; improve: string; thoughts: string }>) => {
    return await callAI({
      type: 'weekly-report',
      context: { entries }
    });
  };

  return {
    smartSort,
    breakdownTask,
    smartDraft,
    lifeAudit,
    dailyBriefing,
    analyzeFinances,
    financeChat,
    journalChat,
    autoCategorize,
    generateSchedule,
    generateHabits,
    weeklyReport
  };
}
