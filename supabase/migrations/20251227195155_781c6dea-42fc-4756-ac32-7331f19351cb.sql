-- Create verification_codes table for custom OTP system
CREATE TABLE public.verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('signup', 'password_reset')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookup
CREATE INDEX idx_verification_codes_email_type ON public.verification_codes(email, type);
CREATE INDEX idx_verification_codes_expires ON public.verification_codes(expires_at);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- No user-facing policies - only service role can access
-- This is intentional for security

-- Add email templates for verification
INSERT INTO public.email_templates (name, slug, subject, body, is_active)
VALUES 
  ('Signup Verification', 'signup_verification', 'Your LifeOS Verification Code', 
   '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
     <h1 style="color: #333; text-align: center;">Welcome to LifeOS!</h1>
     <p style="color: #666; font-size: 16px;">Your verification code is:</p>
     <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
       <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">{{code}}</span>
     </div>
     <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
     <p style="color: #999; font-size: 12px;">If you did not request this code, please ignore this email.</p>
   </div>', true),
  ('Password Reset Verification', 'password_reset_verification', 'Reset Your LifeOS Password',
   '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
     <h1 style="color: #333; text-align: center;">Password Reset Request</h1>
     <p style="color: #666; font-size: 16px;">Your password reset code is:</p>
     <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
       <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">{{code}}</span>
     </div>
     <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
     <p style="color: #999; font-size: 12px;">If you did not request this code, please ignore this email.</p>
   </div>', true)
ON CONFLICT (slug) DO UPDATE SET 
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  is_active = EXCLUDED.is_active;