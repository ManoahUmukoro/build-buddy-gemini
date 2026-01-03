import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Get time-appropriate greeting
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 16) return "Good Afternoon";
  if (hour >= 16 && hour < 21) return "Good Evening";
  return "Hi"; // Late night neutral greeting
}

/**
 * Get formatted date
 */
function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * Get day of week
 */
function getDayOfWeek(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Replaces template variables with actual values
 */
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!resendApiKey) {
      console.error("[daily-digest] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if daily digest is enabled in admin settings
    const { data: notificationSettings } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'notifications')
      .single();

    const notifications = notificationSettings?.value || {};
    if (notifications.email_enabled === false || notifications.daily_digest === false) {
      console.log("[daily-digest] Daily digest is disabled in admin settings");
      return new Response(JSON.stringify({ success: false, message: "Daily digest disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the email template from database - NO FALLBACK
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, body, is_active')
      .eq('slug', 'daily_digest')
      .single();

    if (templateError || !template) {
      console.error("[daily-digest] Email template 'daily_digest' not found in database");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Email template not configured. Please add 'daily_digest' template in admin." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!template.is_active) {
      console.log("[daily-digest] Daily digest template is inactive");
      return new Response(JSON.stringify({ success: false, message: "Template inactive" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch plan features to check entitlements
    const { data: planFeaturesData } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'plan_features')
      .single();

    const planFeatures = planFeaturesData?.value || {};

    // Fetch email configuration
    const { data: emailConfig } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'email_config')
      .single();

    const config = emailConfig?.value || {};
    const fromEmail = config.from_email || 'lifeos@webnexer.com';
    const fromName = config.from_name || 'LifeOS';

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get all users with their profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name');

    if (profilesError) {
      console.error("[daily-digest] Error fetching profiles:", profilesError);
      throw profilesError;
    }

    console.log(`[daily-digest] Processing daily digest for ${profiles?.length || 0} users`);
    let emailsSent = 0;
    let skippedDueToEntitlement = 0;

    for (const profile of profiles || []) {
      try {
        // Get user's email from auth
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);
        
        if (userError || !user?.email) {
          console.log(`[daily-digest] Skipping user ${profile.user_id}: no email found`);
          continue;
        }

        // Check user's plan for daily_digest entitlement
        const { data: userPlan } = await supabase
          .from('user_plans')
          .select('plan, status')
          .eq('user_id', profile.user_id)
          .single();

        const plan = userPlan?.plan || 'free';
        const planConfig = planFeatures[plan] || planFeatures.free || {};
        
        if (planConfig.daily_digest === false) {
          console.log(`[daily-digest] Skipping user ${profile.user_id}: daily_digest not available on ${plan} plan`);
          skippedDueToEntitlement++;
          continue;
        }

        // Get today's tasks
        const { data: todayTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', profile.user_id)
          .eq('day', today);

        const tasksTotal = todayTasks?.length || 0;
        const tasksCompleted = todayTasks?.filter(t => t.done).length || 0;
        const tasksPending = tasksTotal - tasksCompleted;

        // Get habits for today
        const { data: habits } = await supabase
          .from('habits')
          .select('id, name')
          .eq('user_id', profile.user_id);

        const { data: completedHabits } = await supabase
          .from('habit_completions')
          .select('habit_id')
          .eq('user_id', profile.user_id)
          .eq('date', today)
          .eq('completed', true);

        const completedHabitIds = new Set(completedHabits?.map(h => h.habit_id) || []);
        const habitsTotal = habits?.length || 0;
        const habitsCompleted = completedHabits?.length || 0;
        const habitsPending = habitsTotal - habitsCompleted;

        // Get current balance and weekly finances
        const { data: allTransactions } = await supabase
          .from('transactions')
          .select('amount, type, date')
          .eq('user_id', profile.user_id);

        const totalIncome = allTransactions?.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0) || 0;
        const totalExpense = allTransactions?.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0) || 0;
        const balance = totalIncome - totalExpense;

        // Weekly finances
        const weeklyTransactions = allTransactions?.filter(t => t.date >= weekAgo) || [];
        const weeklyIncome = weeklyTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const weeklyExpense = weeklyTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const netSavings = weeklyIncome - weeklyExpense;

        // Get savings goals
        const { data: savingsGoals } = await supabase
          .from('savings_goals')
          .select('name, current, target')
          .eq('user_id', profile.user_id)
          .order('created_at', { ascending: false })
          .limit(1);

        const topGoal = savingsGoals?.[0];
        const savingsGoalName = topGoal?.name || 'No goal set';
        const savingsProgress = topGoal && topGoal.target > 0 
          ? Math.round((topGoal.current / topGoal.target) * 100) 
          : 0;

        // Get mood trend from last 7 days
        const { data: journalEntries } = await supabase
          .from('journal_entries')
          .select('mood')
          .eq('user_id', profile.user_id)
          .gte('date', weekAgo)
          .order('date', { ascending: false });

        const avgMood = journalEntries && journalEntries.length > 0
          ? journalEntries.reduce((acc, e) => acc + e.mood, 0) / journalEntries.length
          : 0;
        
        let moodTrend = "No entries yet";
        if (avgMood >= 4) moodTrend = "Feeling great! 🌟";
        else if (avgMood >= 3) moodTrend = "Doing well 😊";
        else if (avgMood >= 2) moodTrend = "Could be better 🤔";
        else if (avgMood > 0) moodTrend = "Needs attention 💙";

        const journalCount = journalEntries?.length || 0;

        const displayName = profile.display_name || user.email.split('@')[0];
        const appUrl = supabaseUrl.replace('.supabase.co', '.lovable.app').replace('https://', 'https://');

        // Replace variables in template - comprehensive set
        const variables: Record<string, string> = {
          // Personal
          name: displayName,
          email: user.email,
          greeting: getGreeting(),
          
          // Date/Time
          date: getFormattedDate(),
          day_of_week: getDayOfWeek(),
          
          // Tasks
          tasks_count: String(tasksPending),
          tasks_completed: String(tasksCompleted),
          tasks_total: String(tasksTotal),
          
          // Habits
          habits_count: String(habitsPending),
          habits_completed: String(habitsCompleted),
          habits_total: String(habitsTotal),
          
          // Finance
          balance: `$${balance.toFixed(2)}`,
          weekly_income: `$${weeklyIncome.toFixed(2)}`,
          weekly_expense: `$${weeklyExpense.toFixed(2)}`,
          net_savings: `${netSavings >= 0 ? '+' : ''}$${netSavings.toFixed(2)}`,
          savings_goal: savingsGoalName,
          savings_progress: `${savingsProgress}%`,
          
          // Journal
          mood_trend: moodTrend,
          journal_count: String(journalCount),
          
          // Links
          app_url: appUrl,
        };

        const subject = replaceVariables(template.subject, variables);
        const body = replaceVariables(template.body, variables);

        // Send the email
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [user.email],
            subject,
            html: body,
          }),
        });

        const result = await emailResponse.json();
        console.log(`[daily-digest] Sent to ${user.email}:`, result);
        emailsSent++;
      } catch (userError) {
        console.error(`[daily-digest] Error processing user ${profile.user_id}:`, userError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      usersProcessed: profiles?.length || 0,
      emailsSent,
      skippedDueToEntitlement
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[daily-digest] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
