import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { ticketId, userId, subject, messagePreview } = await req.json();

    if (!ticketId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user email and profile
    const { data: userData } = await adminSupabase.auth.admin.getUserById(userId);
    const userEmail = userData?.user?.email;

    if (!userEmail) {
      console.log("User email not found for userId:", userId);
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile for display name
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .single();

    const userName = profile?.display_name || "there";

    // Get email config
    const { data: emailConfig } = await adminSupabase
      .from("admin_settings")
      .select("value")
      .eq("key", "email_config")
      .single();

    const config = emailConfig?.value || {};
    const fromEmail = config.from_email || "noreply@lifeos.app";
    const fromName = config.from_name || "LifeOS Support";

    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "Email not sent (Resend not configured)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [userEmail],
        subject: `Re: ${subject || "Your Support Request"}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Hi ${userName},</h2>
            <p style="color: #666; line-height: 1.6;">Our support team has responded to your ticket:</p>
            <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="color: #333; margin: 0; font-style: italic;">"${messagePreview || "You have a new reply."}"</p>
            </div>
            <p style="color: #666; line-height: 1.6;">Log in to LifeOS to view the full conversation and reply.</p>
            <p style="margin-top: 30px; color: #999; font-size: 14px;">Best regards,<br>The LifeOS Support Team</p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Email notification sent to ${userEmail} for ticket ${ticketId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Notify ticket reply error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});