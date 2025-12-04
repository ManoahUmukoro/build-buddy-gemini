-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day TEXT NOT NULL,
  text TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create systems table
CREATE TABLE public.systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goal TEXT NOT NULL,
  why TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create habits table
CREATE TABLE public.habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  system_id UUID REFERENCES public.systems(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create habit_completions table for tracking daily completions
CREATE TABLE public.habit_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(habit_id, date)
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create budgets table
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  UNIQUE(user_id, category)
);

-- Create journal_entries table
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date TEXT NOT NULL,
  mood INTEGER NOT NULL CHECK (mood >= 1 AND mood <= 5),
  win TEXT,
  improve TEXT,
  thoughts TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_settings table for storing API keys and preferences
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  gemini_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view their own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for systems
CREATE POLICY "Users can view their own systems" ON public.systems FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own systems" ON public.systems FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own systems" ON public.systems FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own systems" ON public.systems FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for habits
CREATE POLICY "Users can view their own habits" ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own habits" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own habits" ON public.habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own habits" ON public.habits FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for habit_completions
CREATE POLICY "Users can view their own habit completions" ON public.habit_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own habit completions" ON public.habit_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own habit completions" ON public.habit_completions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own habit completions" ON public.habit_completions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for categories
CREATE POLICY "Users can view their own categories" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subscriptions" ON public.subscriptions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for budgets
CREATE POLICY "Users can view their own budgets" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own budgets" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budgets" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budgets" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for journal_entries
CREATE POLICY "Users can view their own journal entries" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own journal entries" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own journal entries" ON public.journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own journal entries" ON public.journal_entries FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_settings
CREATE POLICY "Users can view their own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_systems_updated_at BEFORE UPDATE ON public.systems FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();