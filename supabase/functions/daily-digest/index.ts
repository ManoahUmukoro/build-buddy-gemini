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

    // Check if daily digest is enabled in admin settings
    const { data: notificationSettings } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'notifications')
      .single();

    const notifications = notificationSettings?.value || {};
    if (notifications.email_enabled === false || notifications.daily_digest === false) {
      console.log("Daily digest is disabled in admin settings");
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
      console.error("Email template 'daily_digest' not found in database - skipping all emails");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Email template not configured. Please add 'daily_digest' template in admin." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!template.is_active) {
      console.log("Daily digest template is inactive");
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

    const today = new Date().toISOString().split('T')[0];

    // Get all users with their profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name');

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    console.log(`Processing daily digest for ${profiles?.length || 0} users`);
    let emailsSent = 0;
    let skippedDueToEntitlement = 0;

    for (const profile of profiles || []) {
      try {
        // Get user's email from auth
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);
        
        if (userError || !user?.email) {
          console.log(`Skipping user ${profile.user_id}: no email found`);
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
          console.log(`Skipping user ${profile.user_id}: daily_digest not available on ${plan} plan`);
          skippedDueToEntitlement++;
          continue;
        }

        // Get today's tasks
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', profile.user_id)
          .eq('day', today)
          .eq('done', false);

        // Get incomplete habits for today
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
        const pendingHabits = habits?.filter(h => !completedHabitIds.has(h.id)) || [];

        // Get current balance
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount, type')
          .eq('user_id', profile.user_id);

        const totalIncome = transactions?.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0) || 0;
        const totalExpense = transactions?.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0) || 0;
        const balance = totalIncome - totalExpense;

        const displayName = profile.display_name || user.email.split('@')[0];

        // Replace variables in template
        const variables = {
          name: displayName,
          tasks_count: String(tasks?.length || 0),
          habits_count: String(pendingHabits.length),
          balance: `$${balance.toFixed(2)}`,
          email: user.email,
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
        console.log(`Daily digest sent to ${user.email}:`, result);
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
    console.error("Error in daily-digest:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
