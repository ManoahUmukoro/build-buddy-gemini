import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskReminderRequest {
  taskText: string;
  taskTime: string;
  userEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email notification");
      return new Response(JSON.stringify({ success: true, message: "Email not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { taskText, taskTime, userEmail }: TaskReminderRequest = await req.json();

    if (!userEmail) {
      return new Response(JSON.stringify({ error: "No email provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Resend API directly via fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "LifeOS <onboarding@resend.dev>",
        to: [userEmail],
        subject: `⏰ Task Reminder: ${taskText}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
              .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 24px; }
              .content { padding: 32px; }
              .task-card { background: #f4f4f5; border-radius: 12px; padding: 20px; margin: 16px 0; border-left: 4px solid #6366f1; }
              .task-title { font-size: 18px; font-weight: 600; color: #18181b; margin: 0 0 8px 0; }
              .task-time { color: #6366f1; font-weight: 500; font-size: 14px; }
              .footer { text-align: center; padding: 24px; color: #71717a; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⏰ Task Reminder</h1>
              </div>
              <div class="content">
                <p style="color: #52525b; margin-bottom: 16px;">Hey there! This is a friendly reminder about your upcoming task:</p>
                <div class="task-card">
                  <p class="task-title">${taskText}</p>
                  <p class="task-time">Scheduled for: ${taskTime}</p>
                </div>
                <p style="color: #52525b; margin-top: 24px;">Stay focused and crush your goals! 💪</p>
              </div>
              <div class="footer">
                <p>Sent from LifeOS - Your Personal Command Center</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent:", emailResult);

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
