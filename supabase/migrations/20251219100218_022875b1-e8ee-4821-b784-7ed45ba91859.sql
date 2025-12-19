-- Create announcements table for ticker banner
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read active announcements
CREATE POLICY "Anyone can view active announcements"
  ON public.announcements
  FOR SELECT
  USING (is_active = true);

-- Allow admins to manage announcements
CREATE POLICY "Admins can manage announcements"
  ON public.announcements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default announcements
INSERT INTO public.announcements (title, message, is_active, priority)
VALUES 
  ('New Feature', 'AI-powered task sorting is now available in your Dashboard!', true, 1),
  ('Update', 'You can now scan receipts and auto-categorize expenses in Finance.', true, 2);