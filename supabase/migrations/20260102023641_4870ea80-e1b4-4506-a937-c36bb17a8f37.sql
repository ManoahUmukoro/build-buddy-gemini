-- Create chat_messages table for real-time chat support
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages for their own tickets
CREATE POLICY "Users can view messages for their tickets"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = chat_messages.ticket_id 
      AND user_id = auth.uid()
    )
  );

-- Users can insert messages for their own tickets
CREATE POLICY "Users can insert messages for their tickets"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender_type = 'user' AND
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = ticket_id 
      AND user_id = auth.uid()
    )
  );

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON public.chat_messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins can insert messages
CREATE POLICY "Admins can insert messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') AND sender_type = 'admin'
  );

-- Admins can update messages (mark as read)
CREATE POLICY "Admins can update messages"
  ON public.chat_messages FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Users can update their ticket messages (mark as read)
CREATE POLICY "Users can update messages for their tickets"
  ON public.chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = chat_messages.ticket_id 
      AND user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create function to notify admins of new tickets
CREATE OR REPLACE FUNCTION public.notify_admin_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert notification for all admins
  INSERT INTO public.user_notifications (user_id, title, message, type, metadata)
  SELECT 
    ur.user_id,
    'New Support Ticket',
    'A new support ticket has been submitted: ' || NEW.subject,
    'support',
    jsonb_build_object('ticket_id', NEW.id, 'user_id', NEW.user_id)
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  
  RETURN NEW;
END;
$$;

-- Create trigger for new tickets
CREATE TRIGGER on_new_support_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_ticket();

-- Create function to notify admins of new chat messages
CREATE OR REPLACE FUNCTION public.notify_admin_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_subject TEXT;
BEGIN
  -- Only notify on user messages
  IF NEW.sender_type = 'user' THEN
    SELECT subject INTO ticket_subject FROM public.support_tickets WHERE id = NEW.ticket_id;
    
    INSERT INTO public.user_notifications (user_id, title, message, type, metadata)
    SELECT 
      ur.user_id,
      'New Chat Message',
      'New message in: ' || COALESCE(ticket_subject, 'Support Chat'),
      'support',
      jsonb_build_object('ticket_id', NEW.ticket_id, 'message_id', NEW.id)
    FROM public.user_roles ur
    WHERE ur.role = 'admin';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new chat messages
CREATE TRIGGER on_new_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_message();