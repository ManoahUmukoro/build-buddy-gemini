-- Create payment_history table for subscription tracking
CREATE TABLE public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  payment_provider TEXT NOT NULL DEFAULT 'paystack',
  plan TEXT NOT NULL DEFAULT 'pro',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment history
CREATE POLICY "Users can view their own payment history" 
ON public.payment_history 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all payment history
CREATE POLICY "Admins can view all payment history" 
ON public.payment_history 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own payment records
CREATE POLICY "Users can insert their own payment history" 
ON public.payment_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);