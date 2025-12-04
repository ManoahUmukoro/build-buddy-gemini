export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Rent/Bills', 'Entertainment', 'Shopping', 'Health', 'Other'] as const;

export const MOODS = [
  { value: 1, label: '😩 Drained', emoji: '😩' },
  { value: 2, label: '😕 Meh', emoji: '😕' },
  { value: 3, label: '😐 Okay', emoji: '😐' },
  { value: 4, label: '🙂 Good', emoji: '🙂' },
  { value: 5, label: '🤩 Amazing', emoji: '🤩' }
] as const;

export const CHART_COLORS = [
  'hsl(239 84% 67%)',   // Primary indigo
  'hsl(142 71% 45%)',   // Success green
  'hsl(38 92% 50%)',    // Warning amber
  'hsl(0 84% 60%)',     // Destructive red
  'hsl(280 84% 67%)',   // Purple
  'hsl(340 82% 52%)',   // Pink
  'hsl(220 9% 46%)',    // Gray
  'hsl(200 84% 60%)',   // Cyan
  'hsl(160 84% 39%)',   // Teal
] as const;

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Planner' },
  { id: 'systems', label: 'Systems & Goals' },
  { id: 'finance', label: 'Finances' },
  { id: 'journal', label: 'Journal' },
  { id: 'settings', label: 'Data Vault' },
] as const;
