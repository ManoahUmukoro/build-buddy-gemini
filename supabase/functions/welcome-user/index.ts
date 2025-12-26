import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeRequest {
  userId: string;
  email: string;
  displayName?: string;
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
      console.error("RESEND_API_KEY not configured - skipping email");
      return new Response(JSON.stringify({ success: false, error: "Email not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, email, displayName }: WelcomeRequest = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "No email provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if welcome emails are enabled in admin settings
    const { data: notificationSettings, error: notifError } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'notifications')
      .single();

    if (notifError) {
      console.error("Error fetching notification settings:", notifError);
    }

    const notifications = notificationSettings?.value || {};
    if (notifications.email_enabled === false || notifications.welcome_emails === false) {
      console.log("Welcome emails are disabled in admin settings");
      return new Response(JSON.stringify({ success: false, message: "Welcome emails disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the email template from database - NO FALLBACK
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, body, is_active')
      .eq('slug', 'welcome_user')
      .single();

    if (templateError || !template) {
      console.error("Email template 'welcome_user' not found in database - skipping email");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Email template not configured. Please add 'welcome_user' template in admin." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!template.is_active) {
      console.log("Welcome email template is inactive");
      return new Response(JSON.stringify({ success: false, message: "Template inactive" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch email configuration - use hardcoded values for lifeos@webnexer.com
    const fromEmail = 'lifeos@webnexer.com';
    const fromName = 'LifeOS';
    const replyTo = 'support@webnexer.com';

    const name = displayName || email.split('@')[0];

    // Replace variables in template
    const variables = {
      name,
      email,
      user_id: userId || '',
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
        reply_to: replyTo,
        to: [email],
        subject,
        html: body,
      }),
    });

    const result = await emailResponse.json();
    console.log("Welcome email sent:", result);

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in welcome-user:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
