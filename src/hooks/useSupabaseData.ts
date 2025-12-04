import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tasks, System, Transaction, JournalEntry, Budget, Subscription, Habit } from '@/lib/types';
import { DEFAULT_CATEGORIES } from '@/lib/constants';
import { toast } from 'sonner';

export function useSupabaseData() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [tasks, setTasksState] = useState<Tasks>({});
  const [systems, setSystemsState] = useState<System[]>([]);
  const [transactions, setTransactionsState] = useState<Transaction[]>([]);
  const [journalEntries, setJournalEntriesState] = useState<JournalEntry[]>([]);
  const [budgets, setBudgetsState] = useState<Budget>({});
  const [categories, setCategoriesState] = useState<string[]>(DEFAULT_CATEGORIES);
  const [subscriptions, setSubscriptionsState] = useState<Subscription[]>([]);
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
          tasksByDay[t.day].push({ id: t.id as unknown as number, text: t.text, done: t.done });
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

      if (systemsData && habitsData) {
        const systemsWithHabits: System[] = systemsData.map(s => {
          const systemHabits = habitsData.filter(h => h.system_id === s.id);
          return {
            id: s.id as unknown as number,
            goal: s.goal,
            why: s.why || '',
            habits: systemHabits.map(h => {
              const habitCompletions = completionsData?.filter(c => c.habit_id === h.id) || [];
              const completed: { [key: string]: boolean } = {};
              habitCompletions.forEach(c => { completed[c.date] = c.completed; });
              return { id: h.id as unknown as number, name: h.name, completed };
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
          id: t.id as unknown as number,
          type: t.type as 'income' | 'expense',
          amount: Number(t.amount),
          category: t.category,
          description: t.description || '',
          date: t.date
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
          id: j.id as unknown as number,
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
          id: s.id as unknown as number,
          name: s.name,
          amount: Number(s.amount)
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
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Task operations
  const setTasks = async (updater: Tasks | ((prev: Tasks) => Tasks)) => {
    if (!user) return;
    const newTasks = typeof updater === 'function' ? updater(tasks) : updater;
    setTasksState(newTasks);
    
    // Sync to database
    await supabase.from('tasks').delete().eq('user_id', user.id);
    const taskRows = Object.entries(newTasks).flatMap(([day, dayTasks]) =>
      dayTasks.map(t => ({
        id: typeof t.id === 'string' ? t.id : undefined,
        user_id: user.id,
        day,
        text: t.text,
        done: t.done
      }))
    );
    if (taskRows.length > 0) {
      await supabase.from('tasks').upsert(taskRows);
    }
  };

  // System operations
  const setSystems = async (updater: System[] | ((prev: System[]) => System[])) => {
    if (!user) return;
    const newSystems = typeof updater === 'function' ? updater(systems) : updater;
    setSystemsState(newSystems);
    
    // Sync systems
    for (const system of newSystems) {
      const { data: existingSystem } = await supabase
        .from('systems')
        .select('id')
        .eq('user_id', user.id)
        .eq('id', String(system.id))
        .maybeSingle();

      if (!existingSystem) {
        await supabase.from('systems').insert({
          user_id: user.id,
          goal: system.goal,
          why: system.why
        });
      } else {
        await supabase.from('systems')
          .update({ goal: system.goal, why: system.why })
          .eq('id', String(system.id));
      }

      // Sync habits
      for (const habit of system.habits) {
        const { data: existingHabit } = await supabase
          .from('habits')
          .select('id')
          .eq('id', String(habit.id))
          .maybeSingle();

        if (!existingHabit) {
          await supabase.from('habits').insert({
            user_id: user.id,
            system_id: String(system.id),
            name: habit.name
          });
        } else {
          await supabase.from('habits')
            .update({ name: habit.name })
            .eq('id', String(habit.id));
        }

        // Sync completions
        for (const [date, completed] of Object.entries(habit.completed)) {
          await supabase.from('habit_completions').upsert({
            habit_id: String(habit.id),
            user_id: user.id,
            date,
            completed
          }, { onConflict: 'habit_id,date' });
        }
      }
    }

    // Delete removed systems
    const systemIds = newSystems.map(s => String(s.id));
    const { data: existingSystems } = await supabase
      .from('systems')
      .select('id')
      .eq('user_id', user.id);
    
    const removedSystems = existingSystems?.filter(s => !systemIds.includes(s.id)) || [];
    for (const removed of removedSystems) {
      await supabase.from('systems').delete().eq('id', removed.id);
    }
  };

  // Transaction operations
  const setTransactions = async (updater: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
    if (!user) return;
    const newTransactions = typeof updater === 'function' ? updater(transactions) : updater;
    setTransactionsState(newTransactions);
    
    await supabase.from('transactions').delete().eq('user_id', user.id);
    const rows = newTransactions.map(t => ({
      user_id: user.id,
      type: t.type,
      amount: t.amount,
      category: t.category,
      description: t.description,
      date: t.date
    }));
    if (rows.length > 0) {
      await supabase.from('transactions').insert(rows);
    }
  };

  // Journal operations
  const setJournalEntries = async (updater: JournalEntry[] | ((prev: JournalEntry[]) => JournalEntry[])) => {
    if (!user) return;
    const newEntries = typeof updater === 'function' ? updater(journalEntries) : updater;
    setJournalEntriesState(newEntries);
    
    await supabase.from('journal_entries').delete().eq('user_id', user.id);
    const rows = newEntries.map(j => ({
      user_id: user.id,
      date: j.date,
      mood: j.mood,
      win: j.win,
      improve: j.improve,
      thoughts: j.thoughts,
      tags: j.tags
    }));
    if (rows.length > 0) {
      await supabase.from('journal_entries').insert(rows);
    }
  };

  // Budget operations
  const setBudgets = async (updater: Budget | ((prev: Budget) => Budget)) => {
    if (!user) return;
    const newBudgets = typeof updater === 'function' ? updater(budgets) : updater;
    setBudgetsState(newBudgets);
    
    await supabase.from('budgets').delete().eq('user_id', user.id);
    const rows = Object.entries(newBudgets).map(([category, amount]) => ({
      user_id: user.id,
      category,
      amount
    }));
    if (rows.length > 0) {
      await supabase.from('budgets').insert(rows);
    }
  };

  // Category operations
  const setCategories = async (updater: string[] | ((prev: string[]) => string[])) => {
    if (!user) return;
    const newCategories = typeof updater === 'function' ? updater(categories) : updater;
    setCategoriesState(newCategories);
    
    await supabase.from('categories').delete().eq('user_id', user.id);
    const rows = newCategories.map(name => ({ user_id: user.id, name }));
    if (rows.length > 0) {
      await supabase.from('categories').insert(rows);
    }
  };

  // Subscription operations
  const setSubscriptions = async (updater: Subscription[] | ((prev: Subscription[]) => Subscription[])) => {
    if (!user) return;
    const newSubs = typeof updater === 'function' ? updater(subscriptions) : updater;
    setSubscriptionsState(newSubs);
    
    await supabase.from('subscriptions').delete().eq('user_id', user.id);
    const rows = newSubs.map(s => ({
      user_id: user.id,
      name: s.name,
      amount: s.amount
    }));
    if (rows.length > 0) {
      await supabase.from('subscriptions').insert(rows);
    }
  };

  // Gemini API key operations
  const setGeminiApiKey = async (apiKey: string) => {
    if (!user) return;
    setGeminiApiKeyState(apiKey);
    
    await supabase.from('user_settings').upsert({
      user_id: user.id,
      gemini_api_key: apiKey
    }, { onConflict: 'user_id' });
  };

  return {
    loading,
    tasks, setTasks,
    systems, setSystems,
    transactions, setTransactions,
    journalEntries, setJournalEntries,
    budgets, setBudgets,
    categories, setCategories,
    subscriptions, setSubscriptions,
    geminiApiKey, setGeminiApiKey,
    refreshData: loadData
  };
}
