-- Add slug column to email_templates for template lookup
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON public.email_templates(slug);

-- Insert default email templates
INSERT INTO public.email_templates (name, slug, subject, body, is_active, created_at, updated_at)
VALUES 
  ('Welcome Email', 'welcome_user', 'Welcome to LifeOS!', '<h1>Welcome to LifeOS, {{name}}!</h1><p>We''re excited to have you on board. LifeOS is your personal command center for productivity, finance, and growth.</p><p>Get started by exploring the Dashboard, setting up your first system, or tracking your finances.</p><p>Best regards,<br>The LifeOS Team</p>', true, now(), now()),
  ('Task Reminder', 'task_reminder', 'Reminder: {{task_text}}', '<h1>Task Reminder</h1><p>Hi {{name}},</p><p>This is a friendly reminder about your task:</p><p><strong>{{task_text}}</strong></p><p>Scheduled for: {{task_time}}</p><p>Stay productive!<br>LifeOS</p>', true, now(), now()),
  ('Daily Digest', 'daily_digest', 'Your Daily LifeOS Digest', '<h1>Good Morning, {{name}}!</h1><p>Here''s your daily overview:</p><p><strong>Tasks Today:</strong> {{tasks_count}}</p><p><strong>Habits to Complete:</strong> {{habits_count}}</p><p><strong>Current Balance:</strong> {{balance}}</p><p>Have a productive day!<br>LifeOS</p>', true, now(), now()),
  ('Weekly Check-in', 'weekly_checkin', 'Your Weekly LifeOS Summary', '<h1>Weekly Summary for {{name}}</h1><p>Here''s how your week went:</p><p><strong>Tasks Completed:</strong> {{tasks_completed}}/{{tasks_total}}</p><p><strong>Habit Completion Rate:</strong> {{habit_rate}}%</p><p><strong>Journal Entries:</strong> {{journal_count}}</p><p><strong>Net Savings:</strong> {{net_savings}}</p><p>Keep up the great work!<br>LifeOS</p>', true, now(), now())
ON CONFLICT (slug) DO NOTHING;