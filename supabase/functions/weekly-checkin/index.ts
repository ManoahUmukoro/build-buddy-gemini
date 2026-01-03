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
      console.error("[weekly-checkin] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if weekly digest is enabled in admin settings
    const { data: notificationSettings } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'notifications')
      .single();

    const notifications = notificationSettings?.value || {};
    if (notifications.email_enabled === false || notifications.weekly_digest === false) {
      console.log("[weekly-checkin] Weekly digest is disabled in admin settings");
      return new Response(JSON.stringify({ success: false, message: "Weekly digest disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the email template from database - NO FALLBACK
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, body, is_active')
      .eq('slug', 'weekly_checkin')
      .single();

    if (templateError || !template) {
      console.error("[weekly-checkin] Email template 'weekly_checkin' not found in database");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Email template not configured. Please add 'weekly_checkin' template in admin." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!template.is_active) {
      console.log("[weekly-checkin] Weekly checkin template is inactive");
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

    // Get the date range for this week
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    // Get all users with their profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name');

    if (profilesError) throw profilesError;

    console.log(`[weekly-checkin] Processing weekly check-in for ${profiles?.length || 0} users`);
    let emailsSent = 0;
    let skippedDueToEntitlement = 0;

    for (const profile of profiles || []) {
      try {
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);
        
        if (userError || !user?.email) continue;

        // Check user's plan for weekly_digest entitlement
        const { data: userPlan } = await supabase
          .from('user_plans')
          .select('plan, status')
          .eq('user_id', profile.user_id)
          .single();

        const plan = userPlan?.plan || 'free';
        const planConfig = planFeatures[plan] || planFeatures.free || {};
        
        if (planConfig.weekly_digest === false) {
          console.log(`[weekly-checkin] Skipping user ${profile.user_id}: weekly_digest not available on ${plan} plan`);
          skippedDueToEntitlement++;
          continue;
        }

        // Get weekly stats
        const { data: completedTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('user_id', profile.user_id)
          .eq('done', true)
          .gte('day', weekAgoStr)
          .lte('day', todayStr);

        const { data: totalTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('user_id', profile.user_id)
          .gte('day', weekAgoStr)
          .lte('day', todayStr);

        const { data: habitCompletions } = await supabase
          .from('habit_completions')
          .select('id')
          .eq('user_id', profile.user_id)
          .eq('completed', true)
          .gte('date', weekAgoStr)
          .lte('date', todayStr);

        const { data: journalEntries } = await supabase
          .from('journal_entries')
          .select('mood')
          .eq('user_id', profile.user_id)
          .gte('date', weekAgoStr)
          .lte('date', todayStr);

        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount, type')
          .eq('user_id', profile.user_id)
          .gte('date', weekAgoStr)
          .lte('date', todayStr);

        // Get total balance
        const { data: allTransactions } = await supabase
          .from('transactions')
          .select('amount, type')
          .eq('user_id', profile.user_id);

        const totalIncome = allTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
        const totalExpenses = allTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
        const balance = totalIncome - totalExpenses;

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

        // Calculate stats
        const tasksCompleted = completedTasks?.length || 0;
        const tasksTotal = totalTasks?.length || 0;
        const taskCompletionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;
        
        const habitsCompleted = habitCompletions?.length || 0;
        const journalCount = journalEntries?.length || 0;

        const income = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
        const expenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
        const netSavings = income - expenses;

        // Mood trend
        const avgMood = journalEntries && journalEntries.length > 0
          ? journalEntries.reduce((acc, e) => acc + e.mood, 0) / journalEntries.length
          : 0;
        
        let moodTrend = "No entries yet";
        if (avgMood >= 4) moodTrend = "Feeling great! 🌟";
        else if (avgMood >= 3) moodTrend = "Doing well 😊";
        else if (avgMood >= 2) moodTrend = "Could be better 🤔";
        else if (avgMood > 0) moodTrend = "Needs attention 💙";

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
          tasks_completed: String(tasksCompleted),
          tasks_total: String(tasksTotal),
          tasks_count: String(tasksTotal - tasksCompleted),
          habit_rate: `${taskCompletionRate}%`,
          
          // Habits
          habits_completed: String(habitsCompleted),
          habits_count: String(habitsCompleted),
          
          // Finance
          balance: `$${balance.toFixed(2)}`,
          weekly_income: `$${income.toFixed(2)}`,
          weekly_expense: `$${expenses.toFixed(2)}`,
          net_savings: `${netSavings >= 0 ? '+' : ''}$${netSavings.toFixed(2)}`,
          savings_goal: savingsGoalName,
          savings_progress: `${savingsProgress}%`,
          
          // Journal
          journal_count: String(journalCount),
          mood_trend: moodTrend,
          
          // Links
          app_url: appUrl,
        };

        const subject = replaceVariables(template.subject, variables);
        const body = replaceVariables(template.body, variables);

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
        console.log(`[weekly-checkin] Sent to ${user.email}:`, result);
        emailsSent++;
      } catch (userError) {
        console.error(`[weekly-checkin] Error processing user ${profile.user_id}:`, userError);
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
    console.error("[weekly-checkin] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
