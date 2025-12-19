import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
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

    for (const profile of profiles || []) {
      try {
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);
        
        if (userError || !user?.email) continue;

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
        
        const habitsCompleted = habitCompletions?.length || 0;
        const journalDays = journalEntries?.length || 0;
        const avgMood = journalEntries && journalEntries.length > 0 
          ? (journalEntries.reduce((sum, e) => sum + e.mood, 0) / journalEntries.length).toFixed(1)
          : 'N/A';

        const income = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
        const expenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
        const netSavings = income - expenses;

        const displayName = profile.display_name || 'there';

        // Determine overall vibe
        let vibeEmoji = '😊';
        let vibeMessage = 'Good week overall!';
        if (taskCompletionRate >= 80 && habitsCompleted >= 14) {
          vibeEmoji = '🔥';
          vibeMessage = 'Crushing it! Amazing week!';
        } else if (taskCompletionRate < 50) {
          vibeEmoji = '💪';
          vibeMessage = 'Room for improvement. You got this next week!';
        }

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "LifeOS <onboarding@resend.dev>",
            to: [user.email],
            subject: `📊 Your Weekly Recap | ${vibeEmoji} ${taskCompletionRate}% tasks completed`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
                  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
                  .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 32px; text-align: center; }
                  .header h1 { color: white; margin: 0; font-size: 28px; }
                  .header p { color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 16px; }
                  .content { padding: 32px; }
                  .vibe { background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; }
                  .vibe-emoji { font-size: 48px; margin-bottom: 12px; }
                  .vibe-message { color: #92400e; font-size: 18px; font-weight: 600; margin: 0; }
                  .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
                  .stat-card { background: #f9fafb; border-radius: 12px; padding: 20px; text-align: center; }
                  .stat-value { font-size: 32px; font-weight: 700; color: #6366f1; margin: 0; }
                  .stat-label { color: #71717a; font-size: 13px; margin-top: 4px; }
                  .finance-card { background: linear-gradient(135deg, #dcfce7, #bbf7d0); border-radius: 12px; padding: 20px; margin: 16px 0; }
                  .finance-row { display: flex; justify-content: space-between; margin: 8px 0; }
                  .finance-label { color: #166534; }
                  .finance-value { font-weight: 600; color: #166534; }
                  .cta { text-align: center; margin-top: 32px; }
                  .cta a { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
                  .footer { text-align: center; padding: 24px; color: #71717a; font-size: 12px; background: #f9fafb; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Weekly Recap 📊</h1>
                    <p>Hey ${displayName}, here's how your week went!</p>
                  </div>
                  <div class="content">
                    <div class="vibe">
                      <div class="vibe-emoji">${vibeEmoji}</div>
                      <p class="vibe-message">${vibeMessage}</p>
                    </div>

                    <div class="stats-grid">
                      <div class="stat-card">
                        <p class="stat-value">${taskCompletionRate}%</p>
                        <p class="stat-label">Tasks Completed</p>
                      </div>
                      <div class="stat-card">
                        <p class="stat-value">${habitsCompleted}</p>
                        <p class="stat-label">Habits Done</p>
                      </div>
                      <div class="stat-card">
                        <p class="stat-value">${journalDays}/7</p>
                        <p class="stat-label">Journal Days</p>
                      </div>
                      <div class="stat-card">
                        <p class="stat-value">${avgMood}</p>
                        <p class="stat-label">Avg Mood (1-5)</p>
                      </div>
                    </div>

                    <div class="finance-card">
                      <h3 style="margin: 0 0 16px 0; color: #166534;">💰 Financial Summary</h3>
                      <div class="finance-row">
                        <span class="finance-label">Income</span>
                        <span class="finance-value">$${income.toFixed(2)}</span>
                      </div>
                      <div class="finance-row">
                        <span class="finance-label">Expenses</span>
                        <span class="finance-value">$${expenses.toFixed(2)}</span>
                      </div>
                      <div class="finance-row" style="border-top: 1px solid #86efac; padding-top: 8px; margin-top: 8px;">
                        <span class="finance-label" style="font-weight: 600;">Net</span>
                        <span class="finance-value" style="color: ${netSavings >= 0 ? '#166534' : '#dc2626'};">${netSavings >= 0 ? '+' : ''}$${netSavings.toFixed(2)}</span>
                      </div>
                    </div>

                    <div class="cta">
                      <a href="https://lifeos.lovable.app">Plan Next Week →</a>
                    </div>
                  </div>
                  <div class="footer">
                    <p>Keep going! Consistency is key to achieving your goals. 🚀</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          }),
        });

        const result = await emailResponse.json();
        console.log(`Weekly check-in sent to ${user.email}:`, result);
      } catch (userError) {
        console.error(`Error processing user ${profile.user_id}:`, userError);
      }
    }

    return new Response(JSON.stringify({ success: true, usersProcessed: profiles?.length || 0 }), {
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
