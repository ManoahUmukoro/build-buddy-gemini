-- Create user_notifications table for persistent inbox
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications" 
ON public.user_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.user_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow system to insert notifications (via service role)
CREATE POLICY "Service role can insert notifications" 
ON public.user_notifications 
FOR INSERT 
WITH CHECK (true);

-- Create notification_triggers table for admin-controlled triggers
CREATE TABLE public.notification_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  message_title TEXT NOT NULL,
  message_body TEXT NOT NULL,
  schedule_time TIME,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (admin only)
ALTER TABLE public.notification_triggers ENABLE ROW LEVEL SECURITY;

-- Only admins can manage triggers
CREATE POLICY "Admins can manage notification triggers" 
ON public.notification_triggers 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default notification triggers
INSERT INTO public.notification_triggers (name, trigger_type, condition, message_title, message_body, schedule_time, is_active) VALUES
('Inactivity Reminder', 'inactivity', '{"hours_inactive": 24}'::jsonb, 'We missed you!', 'Come back and check your progress on LifeOS.', '18:00:00', true),
('Finance Hygiene', 'no_transactions', '{"days": 1}'::jsonb, 'Log your spending', 'You haven''t logged any transactions today. Keep track of your finances!', '20:00:00', true),
('Plan Tomorrow', 'no_tasks_tomorrow', '{}'::jsonb, 'Plan your day', 'You don''t have any tasks planned for tomorrow. Set yourself up for success!', '21:00:00', true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;