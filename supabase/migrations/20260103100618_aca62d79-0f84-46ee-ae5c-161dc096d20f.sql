-- ============================================
-- Phase 5: Contextual Help Tooltips System
-- Phase 6: What's New Changelog System
-- Phase 7: Interactive Tutorial System
-- ============================================

-- User Hint Dismissals Table
CREATE TABLE public.user_hint_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  hint_id TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, hint_id)
);

ALTER TABLE public.user_hint_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own hint dismissals"
  ON public.user_hint_dismissals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own hint dismissals"
  ON public.user_hint_dismissals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own hint dismissals"
  ON public.user_hint_dismissals FOR DELETE
  USING (user_id = auth.uid());

-- App Changelog Table
CREATE TABLE public.app_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  changes JSONB NOT NULL DEFAULT '[]',
  release_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_major BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read changelog"
  ON public.app_changelog FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage changelog"
  ON public.app_changelog FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- User Tutorial Progress Table
CREATE TABLE public.user_tutorial_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tutorial_id TEXT NOT NULL,
  current_step INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tutorial_id)
);

ALTER TABLE public.user_tutorial_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tutorial progress"
  ON public.user_tutorial_progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own tutorial progress"
  ON public.user_tutorial_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tutorial progress"
  ON public.user_tutorial_progress FOR UPDATE
  USING (user_id = auth.uid());

-- Add columns to profiles for changelog and tutorial tracking
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS last_seen_changelog_version TEXT DEFAULT '0.0.0',
  ADD COLUMN IF NOT EXISTS tutorial_hints_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Insert initial changelog entry
INSERT INTO public.app_changelog (version, title, changes, is_major)
VALUES (
  '2.0.0',
  'AI-Powered LifeOS',
  '["All core features now free - unlimited tasks, goals, and finance tracking", "AI features available with Pro subscription", "New streamlined pricing - Free tier with full access, Pro for AI", "Improved bank statement parsing", "Enhanced security and performance"]'::jsonb,
  true
);