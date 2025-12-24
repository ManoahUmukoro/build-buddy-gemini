-- =============================================
-- PHASE 1: Activity Feed Foundation
-- =============================================

-- Create the central activity_feed table
CREATE TABLE public.activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  related_table TEXT,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_activity_feed_user_id ON public.activity_feed(user_id);
CREATE INDEX idx_activity_feed_event_type ON public.activity_feed(event_type);
CREATE INDEX idx_activity_feed_created_at ON public.activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_user_date ON public.activity_feed(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own activity
CREATE POLICY "Users can view their own activity"
ON public.activity_feed
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity"
ON public.activity_feed
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view activity metadata (not content) for analytics
CREATE POLICY "Admins can view all activity metadata"
ON public.activity_feed
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- TRIGGERS: Auto-populate activity_feed
-- =============================================

-- Trigger function for task completion
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log when a task is marked as done
  IF TG_OP = 'UPDATE' AND NEW.done = true AND OLD.done = false THEN
    INSERT INTO public.activity_feed (user_id, event_type, event_data, related_table, related_id)
    VALUES (
      NEW.user_id,
      'task_completed',
      jsonb_build_object('text', NEW.text, 'day', NEW.day),
      'tasks',
      NEW.id
    );
  END IF;
  
  -- Log new task creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_feed (user_id, event_type, event_data, related_table, related_id)
    VALUES (
      NEW.user_id,
      'task_created',
      jsonb_build_object('text', NEW.text, 'day', NEW.day),
      'tasks',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_task_activity
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.log_task_activity();

-- Trigger function for habit completion
CREATE OR REPLACE FUNCTION public.log_habit_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  habit_name TEXT;
BEGIN
  -- Get habit name
  SELECT name INTO habit_name FROM public.habits WHERE id = NEW.habit_id;
  
  IF NEW.completed = true THEN
    INSERT INTO public.activity_feed (user_id, event_type, event_data, related_table, related_id)
    VALUES (
      NEW.user_id,
      'habit_completed',
      jsonb_build_object('habit_name', habit_name, 'date', NEW.date),
      'habit_completions',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_habit_activity
AFTER INSERT OR UPDATE ON public.habit_completions
FOR EACH ROW
EXECUTE FUNCTION public.log_habit_activity();

-- Trigger function for transactions
CREATE OR REPLACE FUNCTION public.log_transaction_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.activity_feed (user_id, event_type, event_data, related_table, related_id)
  VALUES (
    NEW.user_id,
    CASE WHEN NEW.type = 'income' THEN 'income_recorded' ELSE 'expense_recorded' END,
    jsonb_build_object(
      'amount', NEW.amount,
      'category', NEW.category,
      'type', NEW.type
    ),
    'transactions',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_transaction_activity
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.log_transaction_activity();

-- Trigger function for focus sessions
CREATE OR REPLACE FUNCTION public.log_focus_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only log completed sessions
  IF NEW.completed_at IS NOT NULL THEN
    INSERT INTO public.activity_feed (user_id, event_type, event_data, related_table, related_id)
    VALUES (
      NEW.user_id,
      'focus_completed',
      jsonb_build_object(
        'duration_minutes', NEW.duration_minutes,
        'task_label', COALESCE(NEW.task_label, 'Untitled Session')
      ),
      'focus_sessions',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_focus_activity
AFTER INSERT OR UPDATE ON public.focus_sessions
FOR EACH ROW
EXECUTE FUNCTION public.log_focus_activity();

-- Trigger function for journal entries
CREATE OR REPLACE FUNCTION public.log_journal_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.activity_feed (user_id, event_type, event_data, related_table, related_id)
  VALUES (
    NEW.user_id,
    'journal_entry_created',
    jsonb_build_object(
      'mood', NEW.mood,
      'date', NEW.date,
      'has_win', NEW.win IS NOT NULL AND NEW.win != '',
      'has_reflection', NEW.thoughts IS NOT NULL AND NEW.thoughts != ''
    ),
    'journal_entries',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_journal_activity
AFTER INSERT ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.log_journal_activity();

-- Trigger function for savings entries
CREATE OR REPLACE FUNCTION public.log_savings_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  goal_name TEXT;
BEGIN
  -- Get goal name
  SELECT name INTO goal_name FROM public.savings_goals WHERE id = NEW.savings_goal_id;
  
  INSERT INTO public.activity_feed (user_id, event_type, event_data, related_table, related_id)
  VALUES (
    NEW.user_id,
    CASE WHEN NEW.type = 'deposit' THEN 'savings_deposit' ELSE 'savings_withdrawal' END,
    jsonb_build_object(
      'amount', NEW.amount,
      'goal_name', goal_name,
      'type', NEW.type
    ),
    'savings_entries',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_savings_activity
AFTER INSERT ON public.savings_entries
FOR EACH ROW
EXECUTE FUNCTION public.log_savings_activity();

-- =============================================
-- PHASE 5: Task-Goal Linkage
-- =============================================

-- Add system_id column to tasks for goal linking
ALTER TABLE public.tasks
ADD COLUMN system_id UUID REFERENCES public.systems(id) ON DELETE SET NULL;

-- Create index for efficient queries
CREATE INDEX idx_tasks_system_id ON public.tasks(system_id);

-- =============================================
-- AI Context Function
-- =============================================

-- Create get_user_context function for AI context injection
CREATE OR REPLACE FUNCTION public.get_user_context(uid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  tasks_today INT;
  tasks_completed_today INT;
  habits_today INT;
  habits_completed_today INT;
  recent_mood NUMERIC;
  monthly_income NUMERIC;
  monthly_expenses NUMERIC;
  savings_total NUMERIC;
  active_goals JSONB;
  recent_activity JSONB;
BEGIN
  -- Get today's tasks stats
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE done = true)
  INTO tasks_today, tasks_completed_today
  FROM public.tasks
  WHERE user_id = uid AND day = to_char(CURRENT_DATE, 'YYYY-MM-DD');

  -- Get today's habits stats
  SELECT 
    COUNT(DISTINCT h.id),
    COUNT(DISTINCT hc.habit_id) FILTER (WHERE hc.completed = true)
  INTO habits_today, habits_completed_today
  FROM public.habits h
  LEFT JOIN public.habit_completions hc 
    ON h.id = hc.habit_id 
    AND hc.date = to_char(CURRENT_DATE, 'YYYY-MM-DD')
  WHERE h.user_id = uid;

  -- Get average mood from last 7 days
  SELECT AVG(mood)::NUMERIC(3,1)
  INTO recent_mood
  FROM public.journal_entries
  WHERE user_id = uid 
    AND created_at > CURRENT_DATE - INTERVAL '7 days';

  -- Get this month's income and expenses
  SELECT 
    COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0),
    COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)
  INTO monthly_income, monthly_expenses
  FROM public.transactions
  WHERE user_id = uid 
    AND date >= to_char(date_trunc('month', CURRENT_DATE), 'YYYY-MM-DD');

  -- Get total savings
  SELECT COALESCE(SUM(current), 0)
  INTO savings_total
  FROM public.savings_goals
  WHERE user_id = uid;

  -- Get active goals with progress
  SELECT jsonb_agg(jsonb_build_object(
    'goal', s.goal,
    'habit_count', (SELECT COUNT(*) FROM habits WHERE system_id = s.id)
  ))
  INTO active_goals
  FROM public.systems s
  WHERE s.user_id = uid;

  -- Get recent activity (last 5 events)
  SELECT jsonb_agg(jsonb_build_object(
    'type', event_type,
    'data', event_data,
    'time', created_at
  ) ORDER BY created_at DESC)
  INTO recent_activity
  FROM (
    SELECT event_type, event_data, created_at
    FROM public.activity_feed
    WHERE user_id = uid
    ORDER BY created_at DESC
    LIMIT 5
  ) a;

  -- Build result
  result := jsonb_build_object(
    'tasks', jsonb_build_object(
      'today_total', tasks_today,
      'today_completed', tasks_completed_today,
      'completion_rate', CASE WHEN tasks_today > 0 THEN ROUND((tasks_completed_today::NUMERIC / tasks_today) * 100) ELSE 0 END
    ),
    'habits', jsonb_build_object(
      'today_total', habits_today,
      'today_completed', habits_completed_today
    ),
    'mood', jsonb_build_object(
      'recent_average', COALESCE(recent_mood, 0),
      'trend', CASE 
        WHEN recent_mood >= 4 THEN 'positive'
        WHEN recent_mood >= 3 THEN 'neutral'
        ELSE 'needs_attention'
      END
    ),
    'finances', jsonb_build_object(
      'monthly_income', monthly_income,
      'monthly_expenses', monthly_expenses,
      'monthly_balance', monthly_income - monthly_expenses,
      'total_savings', savings_total
    ),
    'goals', COALESCE(active_goals, '[]'::jsonb),
    'recent_activity', COALESCE(recent_activity, '[]'::jsonb)
  );

  RETURN result;
END;
$$;

-- Enable realtime for activity_feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;