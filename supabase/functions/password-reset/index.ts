import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  resetLink: string;
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
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ success: false, error: "Email not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { email, resetLink }: PasswordResetRequest = await req.json();

    if (!email || !resetLink) {
      return new Response(JSON.stringify({ error: "Missing email or resetLink" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the password reset email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, body, is_active')
      .eq('slug', 'password_reset')
      .single();

    // Default template if not found
    let subject = 'Reset Your LifeOS Password';
    let body = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a2e; margin: 0;">LifeOS</h1>
          <p style="color: #666; margin-top: 5px;">The Operating System for Intentional Living</p>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <h2 style="color: #1a1a2e; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #444; line-height: 1.6;">
            We received a request to reset your password for your LifeOS account associated with <strong>{{email}}</strong>.
          </p>
          <p style="color: #444; line-height: 1.6;">
            Click the button below to reset your password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{reset_link}}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="{{reset_link}}" style="color: #6366f1;">{{reset_link}}</a>
          </p>
        </div>
        
        <div style="text-align: center; color: #999; font-size: 12px;">
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
          <p style="margin-top: 20px;">
            © ${new Date().getFullYear()} LifeOS by Webnexer. All rights reserved.
          </p>
        </div>
      </div>
    `;

    if (template && template.is_active) {
      subject = template.subject;
      body = template.body;
    }

    // Email configuration
    const fromEmail = 'lifeos@webnexer.com';
    const fromName = 'LifeOS';
    const replyTo = 'support@webnexer.com';

    // Replace variables
    const variables = {
      email,
      reset_link: resetLink,
    };

    subject = replaceVariables(subject, variables);
    body = replaceVariables(body, variables);

    console.log("Sending password reset email to:", email);

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
    console.log("Password reset email result:", result);

    if (!emailResponse.ok) {
      throw new Error(result.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in password-reset:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
