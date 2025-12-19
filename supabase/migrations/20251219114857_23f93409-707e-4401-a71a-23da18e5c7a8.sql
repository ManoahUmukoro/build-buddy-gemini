-- Enable realtime for admin_settings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;

-- Enable realtime for announcements table
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;