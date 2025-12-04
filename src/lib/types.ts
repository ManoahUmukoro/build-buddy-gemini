export interface Task {
  id: string | number;
  text: string;
  done: boolean;
}

export interface Tasks {
  [day: string]: Task[];
}

export interface Habit {
  id: string | number;
  name: string;
  completed: { [key: string]: boolean };
}

export interface System {
  id: string | number;
  goal: string;
  why: string;
  habits: Habit[];
}

export interface Transaction {
  id: string | number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface Subscription {
  id: string | number;
  name: string;
  amount: number;
}

export interface JournalEntry {
  id: string | number;
  date: string;
  mood: number;
  win: string;
  improve: string;
  thoughts: string;
  tags?: string[];
}

export interface Budget {
  [category: string]: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type TabId = 'dashboard' | 'systems' | 'finance' | 'journal' | 'settings';

export interface ModalConfig {
  isOpen: boolean;
  type: string | null;
  data: any;
}
