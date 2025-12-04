import { Tasks, System, Transaction, JournalEntry, Budget, Subscription } from './types';
import { DEFAULT_CATEGORIES } from './constants';

const STORAGE_KEYS = {
  tasks: 'lcc_tasks',
  systems: 'lcc_systems',
  finance: 'lcc_finance',
  journal: 'lcc_journal',
  budgets: 'lcc_budgets',
  categories: 'lcc_categories',
  subscriptions: 'lcc_subscriptions',
} as const;

export function loadFromStorage<T>(key: keyof typeof STORAGE_KEYS, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS[key]);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    console.error(`Error loading ${key} from storage:`, e);
    return defaultValue;
  }
}

export function saveToStorage<T>(key: keyof typeof STORAGE_KEYS, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}

export function loadTasks(): Tasks {
  return loadFromStorage('tasks', {});
}

export function loadSystems(): System[] {
  return loadFromStorage('systems', [
    {
      id: 1,
      goal: 'Be a Healthy Runner',
      why: 'Energy for life',
      habits: [{ id: 101, name: 'Drink Water', completed: {} }]
    }
  ]);
}

export function loadTransactions(): Transaction[] {
  return loadFromStorage('finance', []);
}

export function loadJournalEntries(): JournalEntry[] {
  return loadFromStorage('journal', []);
}

export function loadBudgets(): Budget {
  return loadFromStorage('budgets', {});
}

export function loadCategories(): string[] {
  return loadFromStorage('categories', [...DEFAULT_CATEGORIES]);
}

export function loadSubscriptions(): Subscription[] {
  return loadFromStorage('subscriptions', []);
}

export function exportAllData() {
  return {
    tasks: loadTasks(),
    systems: loadSystems(),
    transactions: loadTransactions(),
    journalEntries: loadJournalEntries(),
    budgets: loadBudgets(),
    categories: loadCategories(),
    subscriptions: loadSubscriptions(),
  };
}
