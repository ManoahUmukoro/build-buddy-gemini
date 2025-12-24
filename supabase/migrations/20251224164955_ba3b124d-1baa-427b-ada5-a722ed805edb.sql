-- Fix: Restrict admin_settings SELECT policy to only non-sensitive keys for public access
-- Drop the overly permissive policy that allows anyone to read all settings including payment secrets
DROP POLICY IF EXISTS "Anyone can read admin settings" ON public.admin_settings;

-- Create a new policy that only allows public access to non-sensitive configuration keys
CREATE POLICY "Anyone can read non-sensitive settings"
ON public.admin_settings FOR SELECT
USING (key IN (
  'maintenance_mode',
  'maintenance_message', 
  'modules',
  'onboarding_enabled',
  'ai_features_enabled',
  'branding',
  'support_widget',
  'plan_features',
  'subscription_plans',
  'features'
));

-- Admins can read ALL settings including sensitive payment provider configs
CREATE POLICY "Admins can read all settings"
ON public.admin_settings FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));