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
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    // Get all users with their profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name');

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    console.log(`Processing daily digest for ${profiles?.length || 0} users`);

    for (const profile of profiles || []) {
      try {
        // Get user's email from auth
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);
        
        if (userError || !user?.email) {
          console.log(`Skipping user ${profile.user_id}: no email found`);
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

        // Get savings goals progress
        const { data: savingsGoals } = await supabase
          .from('savings_goals')
          .select('*')
          .eq('user_id', profile.user_id);

        // Get recent journal streak
        const { data: recentJournals } = await supabase
          .from('journal_entries')
          .select('date')
          .eq('user_id', profile.user_id)
          .order('date', { ascending: false })
          .limit(7);

        const journalStreak = recentJournals?.length || 0;
        const hasJournaledToday = recentJournals?.some(j => j.date === today);

        // Build email content
        const taskCount = tasks?.length || 0;
        const habitCount = pendingHabits.length;
        const displayName = profile.display_name || 'there';

        // Generate personalized greeting based on time
        const hour = new Date().getHours();
        let greeting = 'Good morning';
        if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
        else if (hour >= 17) greeting = 'Good evening';

        // Generate motivational message
        const motivationalMessages = [
          "Every small step counts towards your bigger goals! 🎯",
          "Today is a new opportunity to build the life you want! ✨",
          "Consistency is the key to transformation. Keep going! 💪",
          "Your future self will thank you for what you do today! 🚀",
          "Progress, not perfection. You've got this! 🌟",
        ];
        const randomMotivation = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

        // Build task list HTML
        let taskListHtml = '';
        if (taskCount > 0) {
          taskListHtml = `
            <div style="background: #f4f4f5; border-radius: 12px; padding: 20px; margin: 16px 0;">
              <h3 style="margin: 0 0 12px 0; color: #18181b;">📋 Today's Tasks (${taskCount})</h3>
              <ul style="margin: 0; padding-left: 20px; color: #52525b;">
                ${tasks?.slice(0, 5).map(t => `<li style="margin: 8px 0;">${t.text}${t.time ? ` at ${t.time}` : ''}</li>`).join('')}
                ${taskCount > 5 ? `<li style="color: #6366f1;">...and ${taskCount - 5} more</li>` : ''}
              </ul>
            </div>
          `;
        }

        // Build habits list HTML
        let habitsHtml = '';
        if (habitCount > 0) {
          habitsHtml = `
            <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 16px 0;">
              <h3 style="margin: 0 0 12px 0; color: #92400e;">🔥 Habits to Complete (${habitCount})</h3>
              <ul style="margin: 0; padding-left: 20px; color: #78350f;">
                ${pendingHabits.slice(0, 5).map(h => `<li style="margin: 8px 0;">${h.name}</li>`).join('')}
                ${habitCount > 5 ? `<li>...and ${habitCount - 5} more</li>` : ''}
              </ul>
            </div>
          `;
        }

        // Build savings goals HTML
        let savingsHtml = '';
        if (savingsGoals && savingsGoals.length > 0) {
          const totalProgress = savingsGoals.reduce((acc, g) => acc + (g.current / g.target) * 100, 0) / savingsGoals.length;
          savingsHtml = `
            <div style="background: #dcfce7; border-radius: 12px; padding: 20px; margin: 16px 0;">
              <h3 style="margin: 0 0 12px 0; color: #166534;">💰 Savings Progress</h3>
              <p style="margin: 0; color: #15803d;">Average progress: ${Math.round(totalProgress)}% across ${savingsGoals.length} goal${savingsGoals.length > 1 ? 's' : ''}</p>
            </div>
          `;
        }

        // Journal reminder
        let journalHtml = '';
        if (!hasJournaledToday) {
          journalHtml = `
            <div style="background: #ede9fe; border-radius: 12px; padding: 20px; margin: 16px 0;">
              <h3 style="margin: 0 0 8px 0; color: #5b21b6;">📔 Don't forget to journal!</h3>
              <p style="margin: 0; color: #6d28d9;">
                ${journalStreak > 0 ? `You've journaled ${journalStreak} of the last 7 days. Keep it up!` : 'Start your journaling journey today!'}
              </p>
            </div>
          `;
        }

        // Send the email
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "LifeOS <onboarding@resend.dev>",
            to: [user.email],
            subject: `🌅 Your ${dayOfWeek} Check-in | ${taskCount} tasks, ${habitCount} habits`,
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
                  .motivation { background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
                  .motivation p { margin: 0; color: #92400e; font-size: 16px; font-weight: 500; }
                  .cta { text-align: center; margin-top: 32px; }
                  .cta a { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
                  .footer { text-align: center; padding: 24px; color: #71717a; font-size: 12px; background: #f9fafb; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>${greeting}, ${displayName}! 👋</h1>
                    <p>Here's your ${dayOfWeek} overview</p>
                  </div>
                  <div class="content">
                    <div class="motivation">
                      <p>${randomMotivation}</p>
                    </div>
                    ${taskListHtml || '<div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 16px 0; text-align: center;"><p style="margin: 0; color: #166534;">✅ No pending tasks for today!</p></div>'}
                    ${habitsHtml}
                    ${savingsHtml}
                    ${journalHtml}
                    <div class="cta">
                      <a href="https://lifeos.lovable.app">Open LifeOS</a>
                    </div>
                  </div>
                  <div class="footer">
                    <p>You're receiving this because you're a LifeOS user. Keep crushing your goals! 💪</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          }),
        });

        const result = await emailResponse.json();
        console.log(`Daily digest sent to ${user.email}:`, result);
      } catch (userError) {
        console.error(`Error processing user ${profile.user_id}:`, userError);
      }
    }

    return new Response(JSON.stringify({ success: true, usersProcessed: profiles?.length || 0 }), {
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
