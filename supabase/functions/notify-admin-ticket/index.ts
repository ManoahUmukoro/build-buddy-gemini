import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  ticket_id: string;
  ticket_subject: string;
  user_name?: string;
  message_preview?: string;
  type: 'new_ticket' | 'new_message';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { ticket_id, ticket_subject, user_name, message_preview, type }: NotifyRequest = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all admin users
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError || !adminRoles?.length) {
      console.log("No admin users found or error:", rolesError);
      return new Response(JSON.stringify({ skipped: true, reason: "No admins" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get admin emails from auth.users via profiles
    const adminUserIds = adminRoles.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', adminUserIds);

    // For now, we'll create in-app notifications (emails would require verified domain)
    const notifications = adminUserIds.map(adminId => ({
      user_id: adminId,
      title: type === 'new_ticket' ? 'New Support Ticket' : 'New Chat Message',
      message: type === 'new_ticket' 
        ? `${user_name || 'A user'} submitted: "${ticket_subject}"`
        : `New message in "${ticket_subject}": ${message_preview?.slice(0, 50)}...`,
      type: 'support',
      metadata: { ticket_id, type }
    }));

    const { error: notifyError } = await supabase
      .from('user_notifications')
      .insert(notifications);

    if (notifyError) {
      console.error("Error creating notifications:", notifyError);
    }

    console.log(`Notified ${adminUserIds.length} admins about ${type}`);

    return new Response(JSON.stringify({ success: true, notified: adminUserIds.length }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-admin-ticket function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);