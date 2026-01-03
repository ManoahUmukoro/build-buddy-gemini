import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminSendEmailRequest {
  user_id: string;
  template_slug: string;
  custom_subject?: string;
  custom_body?: string;
}

/**
 * Get time-appropriate greeting
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 16) return "Good Afternoon";
  if (hour >= 16 && hour < 21) return "Good Evening";
  return "Hi";
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
      console.error("[admin-send-email] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ success: false, error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { user_id, template_slug, custom_subject, custom_body }: AdminSendEmailRequest = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!template_slug && !custom_body) {
      return new Response(JSON.stringify({ error: "Either template_slug or custom_body is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user data
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(user_id);
    
    if (userError || !user?.email) {
      console.error("[admin-send-email] User not found:", userError);
      return new Response(JSON.stringify({ error: "User not found or has no email" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user_id)
      .single();

    const displayName = profile?.display_name || user.email.split('@')[0];

    // Fetch template if slug provided
    let emailSubject = custom_subject || 'Message from LifeOS';
    let emailBody = custom_body || '';

    if (template_slug) {
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('subject, body')
        .eq('slug', template_slug)
        .single();

      if (templateError || !template) {
        console.error("[admin-send-email] Template not found:", template_slug);
        return new Response(JSON.stringify({ error: `Template '${template_slug}' not found` }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      emailSubject = custom_subject || template.subject;
      emailBody = custom_body || template.body;
    }

    // Fetch user data for variables
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get today's tasks
    const { data: todayTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user_id)
      .eq('day', today);

    const tasksTotal = todayTasks?.length || 0;
    const tasksCompleted = todayTasks?.filter(t => t.done).length || 0;

    // Get habits
    const { data: habits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', user_id);

    const { data: completedHabits } = await supabase
      .from('habit_completions')
      .select('habit_id')
      .eq('user_id', user_id)
      .eq('date', today)
      .eq('completed', true);

    const habitsTotal = habits?.length || 0;
    const habitsCompleted = completedHabits?.length || 0;

    // Get finances
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('amount, type, date')
      .eq('user_id', user_id);

    const totalIncome = allTransactions?.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0) || 0;
    const totalExpense = allTransactions?.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0) || 0;
    const balance = totalIncome - totalExpense;

    const weeklyTransactions = allTransactions?.filter(t => t.date >= weekAgo) || [];
    const weeklyIncome = weeklyTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const weeklyExpense = weeklyTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const netSavings = weeklyIncome - weeklyExpense;

    // Get savings goals
    const { data: savingsGoals } = await supabase
      .from('savings_goals')
      .select('name, current, target')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1);

    const topGoal = savingsGoals?.[0];
    const savingsGoalName = topGoal?.name || 'No goal set';
    const savingsProgress = topGoal && topGoal.target > 0 
      ? Math.round((topGoal.current / topGoal.target) * 100) 
      : 0;

    // Get mood trend
    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('mood')
      .eq('user_id', user_id)
      .gte('date', weekAgo);

    const avgMood = journalEntries && journalEntries.length > 0
      ? journalEntries.reduce((acc, e) => acc + e.mood, 0) / journalEntries.length
      : 0;
    
    let moodTrend = "No entries yet";
    if (avgMood >= 4) moodTrend = "Feeling great! 🌟";
    else if (avgMood >= 3) moodTrend = "Doing well 😊";
    else if (avgMood >= 2) moodTrend = "Could be better 🤔";
    else if (avgMood > 0) moodTrend = "Needs attention 💙";

    const appUrl = supabaseUrl.replace('.supabase.co', '.lovable.app').replace('https://', 'https://');

    // Build comprehensive variables
    const variables: Record<string, string> = {
      // Personal
      name: displayName,
      email: user.email,
      greeting: getGreeting(),
      
      // Date/Time
      date: getFormattedDate(),
      day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      
      // Tasks
      tasks_count: String(tasksTotal - tasksCompleted),
      tasks_completed: String(tasksCompleted),
      tasks_total: String(tasksTotal),
      
      // Habits
      habits_count: String(habitsTotal - habitsCompleted),
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
      journal_count: String(journalEntries?.length || 0),
      
      // Links
      app_url: appUrl,
    };

    // Replace variables
    const finalSubject = replaceVariables(emailSubject, variables);
    const finalBody = replaceVariables(emailBody, variables);

    // Fetch email configuration
    const { data: emailConfig } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'email_config')
      .single();

    const config = emailConfig?.value || {};
    const fromEmail = config.from_email || 'lifeos@webnexer.com';
    const fromName = config.from_name || 'LifeOS';

    // Send email
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [user.email],
        subject: finalSubject,
        html: finalBody,
      }),
    });

    const result = await emailResponse.json();
    console.log(`[admin-send-email] Sent to ${user.email}:`, result);

    return new Response(JSON.stringify({ 
      success: true, 
      result,
      sent_to: user.email,
      subject: finalSubject
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[admin-send-email] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
