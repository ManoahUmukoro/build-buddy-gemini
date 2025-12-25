import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskReminderRequest {
  taskText: string;
  taskTime: string;
  userEmail: string;
  userName?: string;
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
    const { taskText, taskTime, userEmail, userName }: TaskReminderRequest = await req.json();

    if (!userEmail) {
      return new Response(JSON.stringify({ error: "No email provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if task reminders are enabled in admin settings
    const { data: notificationSettings, error: notifError } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'notifications')
      .single();

    if (notifError) {
      console.error("Error fetching notification settings:", notifError);
    }

    const notifications = notificationSettings?.value || {};
    if (notifications.email_enabled === false || notifications.task_reminders === false) {
      console.log("Task reminders are disabled in admin settings");
      return new Response(JSON.stringify({ success: false, message: "Task reminders disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the email template from database - use fallback if not found
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, body, is_active')
      .eq('slug', 'task_reminder')
      .single();

    let emailSubject: string;
    let emailBody: string;

    if (templateError || !template) {
      console.log("Email template 'task_reminder' not found - using fallback template");
      
      // Fallback template
      emailSubject = `⏰ Reminder: ${taskText}`;
      emailBody = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #6366f1; margin-bottom: 16px;">Hey ${userName || userEmail.split('@')[0]}! 👋</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            You have a task scheduled for <strong>${taskTime}</strong>:
          </p>
          <div style="background: #f3f4f6; border-left: 4px solid #6366f1; padding: 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 500;">${taskText}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Stay focused and make it happen! 💪
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Sent from LifeOS - Your Personal Operating System
          </p>
        </div>
      `;
    } else {
      if (!template.is_active) {
        console.log("Task reminder template is inactive");
        return new Response(JSON.stringify({ success: false, message: "Template inactive" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const name = userName || userEmail.split('@')[0];

      // Replace variables in template
      const variables = {
        name,
        task_text: taskText,
        task_time: taskTime,
        email: userEmail,
      };

      emailSubject = replaceVariables(template.subject, variables);
      emailBody = replaceVariables(template.body, variables);
    }

    // Fetch email configuration
    const { data: emailConfig } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'email_config')
      .single();

    const config = emailConfig?.value || {};
    const fromEmail = config.from_email || 'onboarding@resend.dev';
    const fromName = config.from_name || 'LifeOS';

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [userEmail],
        subject: emailSubject,
        html: emailBody,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Task reminder email sent:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-task-reminder:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
