import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      console.error("RESEND_API_KEY not configured");
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
      console.log("Weekly digest is disabled in admin settings");
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
      console.error("Email template 'weekly_checkin' not found in database - skipping all emails");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Email template not configured. Please add 'weekly_checkin' template in admin." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!template.is_active) {
      console.log("Weekly checkin template is inactive");
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
    const fromEmail = config.from_email || 'onboarding@resend.dev';
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

    console.log(`Processing weekly check-in for ${profiles?.length || 0} users`);
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
          console.log(`Skipping user ${profile.user_id}: weekly_digest not available on ${plan} plan`);
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

        // Calculate stats
        const tasksCompleted = completedTasks?.length || 0;
        const tasksTotal = totalTasks?.length || 0;
        const taskCompletionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;
        
        const journalCount = journalEntries?.length || 0;

        const income = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
        const expenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
        const netSavings = income - expenses;

        const displayName = profile.display_name || user.email.split('@')[0];

        // Replace variables in template
        const variables = {
          name: displayName,
          tasks_completed: String(tasksCompleted),
          tasks_total: String(tasksTotal),
          habit_rate: String(taskCompletionRate),
          journal_count: String(journalCount),
          net_savings: `${netSavings >= 0 ? '+' : ''}$${netSavings.toFixed(2)}`,
          email: user.email,
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
        console.log(`Weekly check-in sent to ${user.email}:`, result);
        emailsSent++;
      } catch (userError) {
        console.error(`Error processing user ${profile.user_id}:`, userError);
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
    console.error("Error in weekly-checkin:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
