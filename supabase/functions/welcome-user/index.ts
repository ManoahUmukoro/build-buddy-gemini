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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ success: true, message: "Email not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, email, displayName }: WelcomeRequest = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "No email provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = displayName || email.split('@')[0];

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "LifeOS <onboarding@resend.dev>",
        to: [email],
        subject: "🎉 Welcome to LifeOS - Your Personal Command Center",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7); padding: 48px 32px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 32px; }
              .header p { color: rgba(255,255,255,0.9); margin: 16px 0 0 0; font-size: 18px; }
              .content { padding: 40px 32px; }
              .welcome-text { font-size: 16px; color: #52525b; line-height: 1.7; margin-bottom: 32px; }
              .feature { display: flex; align-items: flex-start; margin: 24px 0; padding: 20px; background: #f9fafb; border-radius: 12px; }
              .feature-icon { font-size: 28px; margin-right: 16px; }
              .feature-content h3 { margin: 0 0 8px 0; color: #18181b; font-size: 16px; }
              .feature-content p { margin: 0; color: #71717a; font-size: 14px; }
              .steps { background: linear-gradient(135deg, #ede9fe, #ddd6fe); border-radius: 16px; padding: 24px; margin: 32px 0; }
              .steps h2 { margin: 0 0 20px 0; color: #5b21b6; font-size: 20px; }
              .step { display: flex; align-items: center; margin: 16px 0; }
              .step-number { width: 32px; height: 32px; background: #6366f1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 16px; flex-shrink: 0; }
              .step-text { color: #3730a3; font-size: 14px; }
              .cta { text-align: center; margin-top: 40px; }
              .cta a { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; }
              .footer { text-align: center; padding: 32px; color: #71717a; font-size: 12px; background: #f9fafb; }
              .quote { font-style: italic; color: #6366f1; border-left: 4px solid #6366f1; padding-left: 20px; margin: 32px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to LifeOS! 🚀</h1>
                <p>Your journey to a more organized life starts now</p>
              </div>
              <div class="content">
                <p class="welcome-text">
                  Hey ${name}! 👋<br><br>
                  We're thrilled to have you join LifeOS - your all-in-one personal command center for managing life, finances, habits, and personal growth.
                </p>

                <div class="quote">
                  "The secret of getting ahead is getting started." — Mark Twain
                </div>

                <h2 style="color: #18181b; margin: 32px 0 20px 0;">What you can do with LifeOS:</h2>

                <div class="feature">
                  <span class="feature-icon">📋</span>
                  <div class="feature-content">
                    <h3>Daily Planner</h3>
                    <p>Organize your tasks day by day. Set times and get reminders so nothing slips through the cracks.</p>
                  </div>
                </div>

                <div class="feature">
                  <span class="feature-icon">💰</span>
                  <div class="feature-content">
                    <h3>Finance Tracker</h3>
                    <p>Track income & expenses, set budgets using the 50/30/20 rule, and work towards your savings goals.</p>
                  </div>
                </div>

                <div class="feature">
                  <span class="feature-icon">🎯</span>
                  <div class="feature-content">
                    <h3>Systems & Habits</h3>
                    <p>Build systems for your goals and track daily habits. Watch your streak grow as you stay consistent!</p>
                  </div>
                </div>

                <div class="feature">
                  <span class="feature-icon">📔</span>
                  <div class="feature-content">
                    <h3>Journal</h3>
                    <p>Reflect on your day with mood tracking, wins, and areas to improve. Build self-awareness over time.</p>
                  </div>
                </div>

                <div class="feature">
                  <span class="feature-icon">🧾</span>
                  <div class="feature-content">
                    <h3>AI Receipt Scanner</h3>
                    <p>Snap a photo of any receipt and let AI extract the transaction details automatically!</p>
                  </div>
                </div>

                <div class="steps">
                  <h2>🚀 Get Started in 3 Steps</h2>
                  <div class="step">
                    <span class="step-number">1</span>
                    <span class="step-text">Create your first system with a goal you want to achieve</span>
                  </div>
                  <div class="step">
                    <span class="step-number">2</span>
                    <span class="step-text">Add a few daily habits you want to build</span>
                  </div>
                  <div class="step">
                    <span class="step-number">3</span>
                    <span class="step-text">Write your first journal entry to reflect on today</span>
                  </div>
                </div>

                <div class="cta">
                  <a href="https://lifeos.lovable.app">Start Using LifeOS →</a>
                </div>
              </div>
              <div class="footer">
                <p style="margin-bottom: 8px;">You'll receive daily check-ins to help you stay on track. 📬</p>
                <p>Made with ❤️ for people who want to level up their lives</p>
              </div>
            </div>
          </body>
          </html>
        `,
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
