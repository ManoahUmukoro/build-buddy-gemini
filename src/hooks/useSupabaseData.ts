import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tasks, System, Transaction, JournalEntry, Budget, Subscription, SavingsGoal } from '@/lib/types';
import { DEFAULT_CATEGORIES } from '@/lib/constants';
import { toast } from 'sonner';
import { SaveStatus } from '@/components/SaveIndicator';
import { showNetworkError, parseNetworkError } from '@/lib/networkErrorHandler';

// Helper to compare IDs regardless of type
const isSameId = (id1: string | number, id2: string | number): boolean => {
  return String(id1) === String(id2);
};

export function useSupabaseData() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Helper to manage save status
  const withSaveStatus = async <T,>(operation: () => Promise<T>): Promise<T | undefined> => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    try {
      const result = await operation();
      setSaveStatus('saved');
      saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      return result;
    } catch (error) {
      setSaveStatus('error');
      saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
      throw error;
    }
  };
  
  // Data states
  const [tasks, setTasksState] = useState<Tasks>({});
  const [systems, setSystemsState] = useState<System[]>([]);
  const [transactions, setTransactionsState] = useState<Transaction[]>([]);
  const [journalEntries, setJournalEntriesState] = useState<JournalEntry[]>([]);
  const [budgets, setBudgetsState] = useState<Budget>({});
  const [categories, setCategoriesState] = useState<string[]>(DEFAULT_CATEGORIES);
  const [subscriptions, setSubscriptionsState] = useState<Subscription[]>([]);
  const [savingsGoals, setSavingsGoalsState] = useState<SavingsGoal[]>([]);
  const [geminiApiKey, setGeminiApiKeyState] = useState<string>('');

  // Load all data
  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);
      
      if (tasksData) {
        const tasksByDay: Tasks = {};
        tasksData.forEach(t => {
          if (!tasksByDay[t.day]) tasksByDay[t.day] = [];
          tasksByDay[t.day].push({ id: t.id, text: t.text, done: t.done });
        });
        setTasksState(tasksByDay);
      }

      // Load systems with habits
      const { data: systemsData } = await supabase
        .from('systems')
        .select('*')
        .eq('user_id', user.id);

      const { data: habitsData } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id);

      const { data: completionsData } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('user_id', user.id);

      if (systemsData) {
        const systemsWithHabits: System[] = systemsData.map(s => {
          const systemHabits = habitsData?.filter(h => h.system_id === s.id) || [];
          return {
            id: s.id,
            goal: s.goal,
            why: s.why || '',
            habits: systemHabits.map(h => {
              const habitCompletions = completionsData?.filter(c => c.habit_id === h.id) || [];
              const completed: { [key: string]: boolean } = {};
              habitCompletions.forEach(c => { completed[c.date] = c.completed; });
              return { id: h.id, name: h.name, completed };
            })
          };
        });
        setSystemsState(systemsWithHabits);
      }

      // Load transactions
      const { data: transData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (transData) {
        setTransactionsState(transData.map(t => ({
          id: t.id,
          type: t.type as 'income' | 'expense',
          amount: Number(t.amount),
          category: t.category,
          description: t.description || '',
          date: t.date,
          bank_account_id: t.bank_account_id || null,
          source: (t.source || 'manual') as 'manual' | 'receipt' | 'bank_import',
          external_reference: t.external_reference || null
        })));
      }

      // Load journal entries
      const { data: journalData } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (journalData) {
        setJournalEntriesState(journalData.map(j => ({
          id: j.id,
          date: j.date,
          mood: j.mood,
          win: j.win || '',
          improve: j.improve || '',
          thoughts: j.thoughts || '',
          tags: j.tags || undefined
        })));
      }

      // Load budgets
      const { data: budgetsData } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id);
      
      if (budgetsData) {
        const budgetMap: Budget = {};
        budgetsData.forEach(b => { budgetMap[b.category] = Number(b.amount); });
        setBudgetsState(budgetMap);
      }

      // Load categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);
      
      if (categoriesData && categoriesData.length > 0) {
        setCategoriesState(categoriesData.map(c => c.name));
      }

      // Load subscriptions
      const { data: subsData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);
      
      if (subsData) {
        setSubscriptionsState(subsData.map(s => ({
          id: s.id,
          name: s.name,
          amount: Number(s.amount)
        })));
      }

      // Load savings goals
      const { data: savingsData } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id);
      
      if (savingsData) {
        setSavingsGoalsState(savingsData.map(s => ({
          id: s.id,
          name: s.name,
          target: Number(s.target),
          current: Number(s.current)
        })));
      }

      // Load user settings (Gemini API key)
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (settingsData?.gemini_api_key) {
        setGeminiApiKeyState(settingsData.gemini_api_key);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      const errorInfo = parseNetworkError(error);
      
      if (errorInfo.type === 'offline') {
        toast.error('You appear to be offline', {
          description: 'Data will sync when you reconnect.',
          duration: 5000,
        });
      } else {
        showNetworkError(error, 'Loading data');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper to check if ID is a UUID from database
  const isUUID = (id: string | number): boolean => {
    const str = String(id);
    return str.includes('-') && str.length === 36;
  };

  // Task operations - upsert based approach
  const setTasks = async (updater: Tasks | ((prev: Tasks) => Tasks)) => {
    if (!user) return;
    const newTasks = typeof updater === 'function' ? updater(tasks) : updater;
    setTasksState(newTasks);
    
    await withSaveStatus(async () => {
      // Get existing task IDs
      const { data: existing } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', user.id);
      const existingIds = new Set(existing?.map(t => t.id) || []);
      
      // Flatten new tasks
      const allNewTasks: { day: string; id: string | number; text: string; done: boolean }[] = [];
      Object.entries(newTasks).forEach(([day, dayTasks]) => {
        dayTasks.forEach(t => allNewTasks.push({ day, ...t }));
      });
      
      // Separate inserts and updates
      for (const task of allNewTasks) {
        const taskIdStr = String(task.id);
        if (isUUID(task.id) && existingIds.has(taskIdStr)) {
          // Update existing
          await supabase.from('tasks')
            .update({ text: task.text, done: task.done, day: task.day })
            .eq('id', taskIdStr);
        } else if (!isUUID(task.id)) {
          // Insert new
          await supabase.from('tasks').insert({
            user_id: user.id,
            day: task.day,
            text: task.text,
            done: task.done
          });
        }
      }
      
      // Delete removed tasks
      const newTaskIds = allNewTasks.filter(t => isUUID(t.id)).map(t => String(t.id));
      const toDelete = existing?.filter(t => !newTaskIds.includes(t.id)) || [];
      for (const task of toDelete) {
        await supabase.from('tasks').delete().eq('id', task.id);
      }
    });
  };

  // System operations
  const setSystems = async (updater: System[] | ((prev: System[]) => System[])) => {
    if (!user) return;
    const newSystems = typeof updater === 'function' ? updater(systems) : updater;
    setSystemsState(newSystems);
    
    await withSaveStatus(async () => {
      // Get existing data
      const { data: existingDbSystems } = await supabase
        .from('systems')
        .select('id')
        .eq('user_id', user.id);
      const existingSystemIds = new Set(existingDbSystems?.map(s => s.id) || []);
      
      const { data: existingDbHabits } = await supabase
        .from('habits')
        .select('id, system_id')
        .eq('user_id', user.id);
      const existingHabitIds = new Set(existingDbHabits?.map(h => h.id) || []);

      // Track ID mappings
      const systemIdMap: Record<string, string> = {};
      const habitIdMap: Record<string, string> = {};

      // Process each system
      for (const system of newSystems) {
        const systemIdStr = String(system.id);
        const isExisting = isUUID(system.id) && existingSystemIds.has(systemIdStr);

        let actualSystemId: string;
        
        if (isExisting) {
          await supabase.from('systems')
            .update({ goal: system.goal, why: system.why })
            .eq('id', systemIdStr);
          actualSystemId = systemIdStr;
        } else {
          const { data: inserted, error } = await supabase.from('systems')
            .insert({ user_id: user.id, goal: system.goal, why: system.why })
            .select('id')
            .single();
          
          if (error || !inserted) {
            console.error('Failed to insert system:', error);
            continue;
          }
          actualSystemId = inserted.id;
        }
        
        systemIdMap[systemIdStr] = actualSystemId;

        // Process habits
        for (const habit of system.habits) {
          const habitIdStr = String(habit.id);
          const isHabitExisting = isUUID(habit.id) && existingHabitIds.has(habitIdStr);

          let actualHabitId: string;

          if (isHabitExisting) {
            await supabase.from('habits')
              .update({ name: habit.name, system_id: actualSystemId })
              .eq('id', habitIdStr);
            actualHabitId = habitIdStr;
          } else {
            const { data: inserted, error } = await supabase.from('habits')
              .insert({ user_id: user.id, system_id: actualSystemId, name: habit.name })
              .select('id')
              .single();
            
            if (error || !inserted) {
              console.error('Failed to insert habit:', error);
              continue;
            }
            actualHabitId = inserted.id;
          }
          
          habitIdMap[habitIdStr] = actualHabitId;

          // Sync completions
          for (const [date, completed] of Object.entries(habit.completed)) {
            const { data: existingCompletion } = await supabase.from('habit_completions')
              .select('id')
              .eq('habit_id', actualHabitId)
              .eq('date', date)
              .maybeSingle();
            
            if (existingCompletion) {
              await supabase.from('habit_completions')
                .update({ completed })
                .eq('id', existingCompletion.id);
            } else {
              await supabase.from('habit_completions')
                .insert({ habit_id: actualHabitId, user_id: user.id, date, completed });
            }
          }
        }
      }

      // Delete removed systems and their habits
      const newSystemIds = newSystems.map(s => systemIdMap[String(s.id)] || String(s.id));
      const removedSystems = existingDbSystems?.filter(s => !newSystemIds.includes(s.id)) || [];
      for (const removed of removedSystems) {
        await supabase.from('habit_completions').delete().match({ user_id: user.id });
        await supabase.from('habits').delete().eq('system_id', removed.id);
        await supabase.from('systems').delete().eq('id', removed.id);
      }
      
      // Delete removed habits
      const allNewHabitIds = newSystems.flatMap(s => 
        s.habits.map(h => habitIdMap[String(h.id)] || String(h.id))
      );
      const removedHabits = existingDbHabits?.filter(h => !allNewHabitIds.includes(h.id)) || [];
      for (const removed of removedHabits) {
        await supabase.from('habit_completions').delete().eq('habit_id', removed.id);
        await supabase.from('habits').delete().eq('id', removed.id);
      }
    });
  };

  // Transaction operations - individual upserts
  const setTransactions = async (updater: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
    if (!user) return;
    const newTransactions = typeof updater === 'function' ? updater(transactions) : updater;
    setTransactionsState(newTransactions);
    
    await withSaveStatus(async () => {
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', user.id);
      const existingIds = new Set(existing?.map(t => t.id) || []);
      
      for (const t of newTransactions) {
        const idStr = String(t.id);
        if (isUUID(t.id) && existingIds.has(idStr)) {
          await supabase.from('transactions')
            .update({ 
              type: t.type, 
              amount: t.amount, 
              category: t.category, 
              description: t.description, 
              date: t.date,
              bank_account_id: t.bank_account_id || null,
              source: t.source || 'manual',
              external_reference: t.external_reference || null
            })
            .eq('id', idStr);
        } else if (!isUUID(t.id)) {
          await supabase.from('transactions').insert({
            user_id: user.id,
            type: t.type,
            amount: t.amount,
            category: t.category,
            description: t.description,
            date: t.date,
            bank_account_id: t.bank_account_id || null,
            source: t.source || 'manual',
            external_reference: t.external_reference || null
          });
        }
      }
      
      // Delete removed
      const newIds = newTransactions.filter(t => isUUID(t.id)).map(t => String(t.id));
      const toDelete = existing?.filter(t => !newIds.includes(t.id)) || [];
      for (const t of toDelete) {
        await supabase.from('transactions').delete().eq('id', t.id);
      }
    });
  };

  // Journal operations
  const setJournalEntries = async (updater: JournalEntry[] | ((prev: JournalEntry[]) => JournalEntry[])) => {
    if (!user) return;
    const newEntries = typeof updater === 'function' ? updater(journalEntries) : updater;
    setJournalEntriesState(newEntries);
    
    await withSaveStatus(async () => {
      const { data: existing } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('user_id', user.id);
      const existingIds = new Set(existing?.map(j => j.id) || []);
      
      for (const j of newEntries) {
        const idStr = String(j.id);
        if (isUUID(j.id) && existingIds.has(idStr)) {
          await supabase.from('journal_entries')
            .update({ date: j.date, mood: j.mood, win: j.win, improve: j.improve, thoughts: j.thoughts, tags: j.tags })
            .eq('id', idStr);
        } else if (!isUUID(j.id)) {
          await supabase.from('journal_entries').insert({
            user_id: user.id,
            date: j.date,
            mood: j.mood,
            win: j.win,
            improve: j.improve,
            thoughts: j.thoughts,
            tags: j.tags
          });
        }
      }
      
      const newIds = newEntries.filter(j => isUUID(j.id)).map(j => String(j.id));
      const toDelete = existing?.filter(j => !newIds.includes(j.id)) || [];
      for (const j of toDelete) {
        await supabase.from('journal_entries').delete().eq('id', j.id);
      }
    });
  };

  // Budget operations
  const setBudgets = async (updater: Budget | ((prev: Budget) => Budget)) => {
    if (!user) return;
    const newBudgets = typeof updater === 'function' ? updater(budgets) : updater;
    setBudgetsState(newBudgets);
    
    await withSaveStatus(async () => {
      // Upsert each budget category
      for (const [category, amount] of Object.entries(newBudgets)) {
        const { data: existing } = await supabase
          .from('budgets')
          .select('id')
          .eq('user_id', user.id)
          .eq('category', category)
          .maybeSingle();
        
        if (existing) {
          await supabase.from('budgets')
            .update({ amount })
            .eq('id', existing.id);
        } else {
          await supabase.from('budgets').insert({
            user_id: user.id,
            category,
            amount
          });
        }
      }
    });
  };

  // Category operations
  const setCategories = async (updater: string[] | ((prev: string[]) => string[])) => {
    if (!user) return;
    const newCategories = typeof updater === 'function' ? updater(categories) : updater;
    setCategoriesState(newCategories);
    
    await withSaveStatus(async () => {
      const { data: existing } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id);
      const existingNames = new Set(existing?.map(c => c.name) || []);
      
      // Add new categories
      for (const name of newCategories) {
        if (!existingNames.has(name)) {
          await supabase.from('categories').insert({ user_id: user.id, name });
        }
      }
      
      // Delete removed categories
      const toDelete = existing?.filter(c => !newCategories.includes(c.name)) || [];
      for (const c of toDelete) {
        await supabase.from('categories').delete().eq('id', c.id);
      }
    });
  };

  // Subscription operations
  const setSubscriptions = async (updater: Subscription[] | ((prev: Subscription[]) => Subscription[])) => {
    if (!user) return;
    const newSubs = typeof updater === 'function' ? updater(subscriptions) : updater;
    setSubscriptionsState(newSubs);
    
    await withSaveStatus(async () => {
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id);
      const existingIds = new Set(existing?.map(s => s.id) || []);
      
      for (const s of newSubs) {
        const idStr = String(s.id);
        if (isUUID(s.id) && existingIds.has(idStr)) {
          await supabase.from('subscriptions')
            .update({ name: s.name, amount: s.amount })
            .eq('id', idStr);
        } else if (!isUUID(s.id)) {
          await supabase.from('subscriptions').insert({
            user_id: user.id,
            name: s.name,
            amount: s.amount
          });
        }
      }
      
      const newIds = newSubs.filter(s => isUUID(s.id)).map(s => String(s.id));
      const toDelete = existing?.filter(s => !newIds.includes(s.id)) || [];
      for (const s of toDelete) {
        await supabase.from('subscriptions').delete().eq('id', s.id);
      }
    });
  };

  // Gemini API key operations
  const setGeminiApiKey = async (apiKey: string) => {
    if (!user) return;
    setGeminiApiKeyState(apiKey);
    
    await withSaveStatus(async () => {
      await supabase.from('user_settings').upsert({
        user_id: user.id,
        gemini_api_key: apiKey
      }, { onConflict: 'user_id' });
    });
  };

  // Savings goals operations - returns updated goals with DB UUIDs
  const setSavingsGoals = async (updater: SavingsGoal[] | ((prev: SavingsGoal[]) => SavingsGoal[])) => {
    if (!user) return;
    const newGoals = typeof updater === 'function' ? updater(savingsGoals) : updater;
    setSavingsGoalsState(newGoals);
    
    await withSaveStatus(async () => {
      const { data: existing } = await supabase
        .from('savings_goals')
        .select('id')
        .eq('user_id', user.id);
      const existingIds = new Set(existing?.map(s => s.id) || []);
      
      const updatedGoals: SavingsGoal[] = [];
      
      for (const s of newGoals) {
        const idStr = String(s.id);
        if (isUUID(s.id) && existingIds.has(idStr)) {
          await supabase.from('savings_goals')
            .update({ name: s.name, target: s.target, current: s.current })
            .eq('id', idStr);
          updatedGoals.push(s);
        } else if (!isUUID(s.id)) {
          // Insert and get the real UUID back
          const { data: inserted, error } = await supabase.from('savings_goals')
            .insert({
              user_id: user.id,
              name: s.name,
              target: s.target,
              current: s.current
            })
            .select('id')
            .single();
          
          if (!error && inserted) {
            // Replace temp ID with real UUID
            updatedGoals.push({ ...s, id: inserted.id });
          } else {
            console.error('Failed to insert savings goal:', error);
            updatedGoals.push(s);
          }
        }
      }
      
      // Update state with real UUIDs
      setSavingsGoalsState(updatedGoals);
      
      const newIds = updatedGoals.filter(s => isUUID(s.id)).map(s => String(s.id));
      const toDelete = existing?.filter(s => !newIds.includes(s.id)) || [];
      for (const s of toDelete) {
        await supabase.from('savings_goals').delete().eq('id', s.id);
      }
    });
  };

  return {
    saveStatus,
    loading,
    tasks, setTasks,
    systems, setSystems,
    transactions, setTransactions,
    journalEntries, setJournalEntries,
    budgets, setBudgets,
    categories, setCategories,
    subscriptions, setSubscriptions,
    savingsGoals, setSavingsGoals,
    geminiApiKey, setGeminiApiKey,
    refreshData: loadData
  };
}
