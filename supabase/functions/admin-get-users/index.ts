import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user from the JWT
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'moderator'])
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all users from auth.users using admin API
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch profiles, plans, and roles in parallel
    const [profilesRes, plansRes, rolesRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('user_id, display_name, created_at'),
      supabaseAdmin.from('user_plans').select('user_id, plan, status'),
      supabaseAdmin.from('user_roles').select('user_id, role'),
    ]);

    const profiles = profilesRes.data || [];
    const plans = plansRes.data || [];
    const roles = rolesRes.data || [];

    // Combine data
    const combinedUsers = users.map((authUser) => {
      const profile = profiles.find(p => p.user_id === authUser.id);
      const plan = plans.find(p => p.user_id === authUser.id);
      const role = roles.find(r => r.user_id === authUser.id);

      return {
        id: authUser.id,
        email: authUser.email || '',
        email_confirmed: authUser.email_confirmed_at !== null,
        created_at: authUser.created_at,
        last_sign_in: authUser.last_sign_in_at,
        display_name: profile?.display_name || null,
        plan: plan?.plan || 'free',
        status: plan?.status || 'active',
        role: role?.role || null,
      };
    });

    // Calculate stats
    const stats = {
      totalUsers: combinedUsers.length,
      activeUsers: combinedUsers.filter(u => u.status === 'active').length,
      proUsers: combinedUsers.filter(u => u.plan === 'pro').length,
      freeUsers: combinedUsers.filter(u => u.plan === 'free').length,
    };

    return new Response(
      JSON.stringify({ users: combinedUsers, stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
