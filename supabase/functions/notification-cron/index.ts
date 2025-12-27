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

    console.log(`Running notification cron at ${now.toISOString()}`);

    // Get active notification triggers
    const { data: triggers, error: triggersError } = await supabase
      .from("notification_triggers")
      .select("*")
      .eq("is_active", true);

    if (triggersError) {
      throw triggersError;
    }

    console.log(`Found ${triggers?.length || 0} active triggers`);

    // Get all users for processing
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("user_id");

    if (usersError) {
      throw usersError;
    }

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
        // Check if schedule time matches (within 30 min window)
        if (trigger.schedule_time) {
          const [triggerHour, triggerMinute] = trigger.schedule_time.split(":").map(Number);
          const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (triggerHour * 60 + triggerMinute));
          if (timeDiff > 30) continue;
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
              shouldNotify = hoursInactive >= (trigger.condition?.hours_inactive || 24);
            }
            break;
          }

          case "no_transactions": {
            // Check if user logged any transactions today
            const { data: todayTransactions, count } = await supabase
              .from("transactions")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("date", today);

            shouldNotify = (count || 0) === 0;
            break;
          }

          case "no_tasks_tomorrow": {
            // Check if user has tasks for tomorrow
            const tomorrowDayIndex = new Date(tomorrow).getDay();
            const dayKey = `d${tomorrowDayIndex === 0 ? 6 : tomorrowDayIndex - 1}`;
            
            const { data: tomorrowTasks, count } = await supabase
              .from("tasks")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("day", dayKey);

            shouldNotify = (count || 0) === 0;
            break;
          }

          case "broadcast": {
            // Admin broadcasts are handled separately
            shouldNotify = false;
            break;
          }
        }

        if (shouldNotify) {
          notificationsToInsert.push({
            user_id: userId,
            title: trigger.message_title,
            message: trigger.message_body,
            type: trigger.trigger_type,
            metadata: { trigger_id: trigger.id },
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
        throw insertError;
      }

      console.log(`Inserted ${notificationsToInsert.length} notifications`);
    } else {
      console.log("No notifications to insert");
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_users: users?.length || 0,
        notifications_sent: notificationsToInsert.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Notification cron error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
