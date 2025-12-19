-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create user_plans table
CREATE TABLE public.user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plan"
ON public.user_plans
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all plans"
ON public.user_plans
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage plans"
ON public.user_plans
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin_settings table for app configuration
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read admin settings"
ON public.admin_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage settings"
ON public.admin_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create help_content table for dynamic help center
CREATE TABLE public.help_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.help_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published help content"
ON public.help_content
FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can manage help content"
ON public.help_content
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create email_templates table
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates"
ON public.email_templates
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default admin settings
INSERT INTO public.admin_settings (key, value) VALUES
  ('onboarding_enabled', 'true'),
  ('ai_features_enabled', 'true'),
  ('modules', '{"dashboard": true, "systems": true, "finance": true, "journal": true, "help": true}'),
  ('pro_features', '{"ai_chat": true, "advanced_analytics": true, "unlimited_entries": true}'),
  ('payment_providers', '{"paystack": {"enabled": false, "public_key": "", "secret_key": ""}, "flutterwave": {"enabled": false, "public_key": "", "secret_key": ""}, "stripe": {"enabled": false, "public_key": "", "secret_key": ""}}'),
  ('email_config', '{"from_email": "", "from_name": "LifeOS"}');

-- Insert default email templates
INSERT INTO public.email_templates (name, subject, body) VALUES
  ('welcome', 'Welcome to LifeOS!', 'Hi {{name}},\n\nWelcome to LifeOS! We are excited to have you on board.\n\nBest,\nThe LifeOS Team'),
  ('password_reset', 'Reset Your Password', 'Hi {{name}},\n\nClick the link below to reset your password:\n{{reset_link}}\n\nBest,\nThe LifeOS Team'),
  ('subscription_confirmed', 'Subscription Confirmed', 'Hi {{name}},\n\nYour {{plan}} subscription has been confirmed.\n\nBest,\nThe LifeOS Team');

-- Trigger for updated_at on user_plans
CREATE TRIGGER update_user_plans_updated_at
  BEFORE UPDATE ON public.user_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on help_content
CREATE TRIGGER update_help_content_updated_at
  BEFORE UPDATE ON public.help_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on email_templates
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on admin_settings
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();