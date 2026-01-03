import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const today = now.toISOString().split("T")[0];
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().split("T")[0];

    console.log(`[notification-cron] Running at ${now.toISOString()} (Hour: ${currentHour}, Minute: ${currentMinute})`);

    // Get active notification triggers
    const { data: triggers, error: triggersError } = await supabase
      .from("notification_triggers")
      .select("*")
      .eq("is_active", true);

    if (triggersError) {
      console.error("[notification-cron] Error fetching triggers:", triggersError);
      throw triggersError;
    }

    console.log(`[notification-cron] Found ${triggers?.length || 0} active triggers`);

    // Get all users for processing
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("user_id");

    if (usersError) {
      console.error("[notification-cron] Error fetching users:", usersError);
      throw usersError;
    }

    console.log(`[notification-cron] Processing ${users?.length || 0} users`);

    const notificationsToInsert: Array<{
      user_id: string;
      title: string;
      message: string;
      type: string;
      metadata: object;
    }> = [];

    for (const user of users || []) {
      const userId = user.user_id;

      for (const trigger of triggers || []) {
        // Check if schedule time matches (within 15 min window for more precision)
        if (trigger.schedule_time) {
          const [triggerHour, triggerMinute] = trigger.schedule_time.split(":").map(Number);
          const triggerTotalMins = triggerHour * 60 + triggerMinute;
          const currentTotalMins = currentHour * 60 + currentMinute;
          const timeDiff = Math.abs(currentTotalMins - triggerTotalMins);
          if (timeDiff > 15) {
            continue;
          }
        }

        // Check if user already received this notification today
        const { data: existingNotif } = await supabase
          .from("user_notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", trigger.trigger_type)
          .gte("created_at", today)
          .maybeSingle();

        if (existingNotif) continue;

        let shouldNotify = false;
        const condition = trigger.condition || {};

        switch (trigger.trigger_type) {
          case "inactivity": {
            // Check last activity (using activity_feed)
            const { data: lastActivity } = await supabase
              .from("activity_feed")
              .select("created_at")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (lastActivity) {
              const lastActiveDate = new Date(lastActivity.created_at);
              const hoursInactive = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60);
              const hoursThreshold = condition.hours_inactive || (condition.days ? condition.days * 24 : 24);
              shouldNotify = hoursInactive >= hoursThreshold;
              if (shouldNotify) {
                console.log(`[notification-cron] User ${userId}: inactive for ${hoursInactive.toFixed(1)} hours (threshold: ${hoursThreshold})`);
              }
            }
            break;
          }

          case "no_transactions": {
            // Check if user logged any transactions today
            const { count } = await supabase
              .from("transactions")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("date", today);

            shouldNotify = (count || 0) === 0;
            if (shouldNotify) {
              console.log(`[notification-cron] User ${userId}: no transactions today`);
            }
            break;
          }

          case "no_tasks_tomorrow": {
            // Check if user has tasks for tomorrow using the date string directly
            const { count } = await supabase
              .from("tasks")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("day", tomorrow);

            shouldNotify = (count || 0) === 0;
            if (shouldNotify) {
              console.log(`[notification-cron] User ${userId}: no tasks for tomorrow (${tomorrow})`);
            }
            break;
          }

          case "low_savings": {
            // Check if any savings goal is behind schedule
            const { data: goals } = await supabase
              .from("savings_goals")
              .select("*")
              .eq("user_id", userId);

            if (goals && goals.length > 0) {
              for (const goal of goals) {
                if (goal.target > 0) {
                  const progress = (goal.current / goal.target) * 100;
                  const thresholdPercent = condition.threshold_percent || 50;
                  
                  // If target_date is set, check if we're behind schedule
                  if (goal.target_date) {
                    const targetDate = new Date(goal.target_date);
                    const createdDate = new Date(goal.created_at);
                    const totalDays = (targetDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
                    const daysElapsed = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
                    const expectedProgress = (daysElapsed / totalDays) * 100;
                    
                    if (progress < expectedProgress * 0.5) {
                      shouldNotify = true;
                      console.log(`[notification-cron] User ${userId}: savings goal "${goal.name}" behind schedule (${progress.toFixed(1)}% vs expected ${expectedProgress.toFixed(1)}%)`);
                      break;
                    }
                  } else if (progress < thresholdPercent) {
                    shouldNotify = true;
                    console.log(`[notification-cron] User ${userId}: savings goal "${goal.name}" at ${progress.toFixed(1)}% (threshold: ${thresholdPercent}%)`);
                    break;
                  }
                }
              }
            }
            break;
          }

          case "habit_streak_at_risk": {
            // Check if any habit hasn't been completed today by the threshold hour
            const thresholdHour = condition.threshold_hour || 18; // Default 6 PM
            
            if (currentHour >= thresholdHour) {
              const { data: habits } = await supabase
                .from("habits")
                .select("id, name")
                .eq("user_id", userId);

              if (habits && habits.length > 0) {
                const { data: todayCompletions } = await supabase
                  .from("habit_completions")
                  .select("habit_id")
                  .eq("user_id", userId)
                  .eq("date", today)
                  .eq("completed", true);

                const completedIds = new Set(todayCompletions?.map(c => c.habit_id) || []);
                const incompleteHabits = habits.filter(h => !completedIds.has(h.id));

                if (incompleteHabits.length > 0) {
                  shouldNotify = true;
                  console.log(`[notification-cron] User ${userId}: ${incompleteHabits.length} habits at risk of breaking streak`);
                }
              }
            }
            break;
          }

          case "budget_exceeded": {
            // Check if any budget category is exceeded
            const { data: budgets } = await supabase
              .from("budgets")
              .select("*")
              .eq("user_id", userId);

            if (budgets && budgets.length > 0) {
              // Get this month's start date
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
              
              const { data: transactions } = await supabase
                .from("transactions")
                .select("category, amount")
                .eq("user_id", userId)
                .eq("type", "expense")
                .gte("date", monthStart)
                .lte("date", today);

              if (transactions) {
                const spendingByCategory: Record<string, number> = {};
                transactions.forEach(t => {
                  spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + t.amount;
                });

                for (const budget of budgets) {
                  const spent = spendingByCategory[budget.category] || 0;
                  if (spent > budget.amount) {
                    shouldNotify = true;
                    console.log(`[notification-cron] User ${userId}: budget exceeded for "${budget.category}" (${spent} > ${budget.amount})`);
                    break;
                  }
                }
              }
            }
            break;
          }

          case "goal_achieved": {
            // Check if any savings goal was just achieved
            const { data: goals } = await supabase
              .from("savings_goals")
              .select("*")
              .eq("user_id", userId);

            if (goals) {
              for (const goal of goals) {
                if (goal.current >= goal.target && goal.target > 0) {
                  // Check if we already notified about this goal
                  const { data: existingGoalNotif } = await supabase
                    .from("user_notifications")
                    .select("id")
                    .eq("user_id", userId)
                    .eq("type", "goal_achieved")
                    .contains("metadata", { goal_id: goal.id })
                    .maybeSingle();

                  if (!existingGoalNotif) {
                    shouldNotify = true;
                    console.log(`[notification-cron] User ${userId}: achieved savings goal "${goal.name}"`);
                    break;
                  }
                }
              }
            }
            break;
          }

          case "broadcast": {
            // Broadcast sends to all users at scheduled time
            shouldNotify = true;
            console.log(`[notification-cron] Broadcasting to user ${userId}`);
            break;
          }

          default:
            console.log(`[notification-cron] Unknown trigger type: ${trigger.trigger_type}`);
        }

        if (shouldNotify) {
          notificationsToInsert.push({
            user_id: userId,
            title: trigger.message_title,
            message: trigger.message_body,
            type: trigger.trigger_type,
            metadata: { trigger_id: trigger.id, triggered_at: now.toISOString() },
          });
        }
      }
    }

    // Insert all notifications
    if (notificationsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("user_notifications")
        .insert(notificationsToInsert);

      if (insertError) {
        console.error("[notification-cron] Error inserting notifications:", insertError);
        throw insertError;
      }

      console.log(`[notification-cron] Inserted ${notificationsToInsert.length} notifications`);
    } else {
      console.log("[notification-cron] No notifications to insert");
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        processed_users: users?.length || 0,
        active_triggers: triggers?.length || 0,
        notifications_sent: notificationsToInsert.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[notification-cron] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
