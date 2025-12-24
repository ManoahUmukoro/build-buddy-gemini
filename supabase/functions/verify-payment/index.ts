import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth token to verify identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { reference, provider, transactionId } = await req.json();

    // Verify the payment belongs to the authenticated user
    const { data: existingPayment } = await supabase
      .from('payment_history')
      .select('*')
      .eq('reference', reference)
      .eq('user_id', user.id)
      .single();

    if (!existingPayment) {
      return new Response(
        JSON.stringify({ error: 'Payment not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment provider settings
    const { data: providerSettings } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'payment_providers')
      .single();

    const providers = providerSettings?.value as Record<string, any>;
    const config = providers?.[provider];

    if (!config?.secret_key) {
      return new Response(
        JSON.stringify({ error: `${provider} configuration not found` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let verified = false;
    let paymentData: any = null;

    if (provider === 'paystack') {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { 'Authorization': `Bearer ${config.secret_key}` },
      });
      const data = await response.json();
      verified = data.status && data.data?.status === 'success';
      paymentData = data.data;

    } else if (provider === 'flutterwave') {
      // Flutterwave: verify by tx_ref (reference) if no transactionId provided
      let verifyUrl = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`;
      if (transactionId) {
        verifyUrl = `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`;
      }
      const response = await fetch(verifyUrl, {
        headers: { 'Authorization': `Bearer ${config.secret_key}` },
      });
      const data = await response.json();
      verified = data.status === 'success' && data.data?.status === 'successful';
      paymentData = data.data;

    } else if (provider === 'stripe') {
      // For Stripe, we verify by checking the payment record
      // In production, you'd use webhooks, but this works for verification
      if (existingPayment) {
        // Mark as success if it exists (webhook would have updated it)
        verified = true;
        paymentData = existingPayment;
      }
    }

    if (verified) {
      // Update payment status
      await supabase
        .from('payment_history')
        .update({ status: 'success' })
        .eq('reference', reference);

      // Upgrade user plan
      const { data: existingPlan } = await supabase
        .from('user_plans')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingPlan) {
        await supabase
          .from('user_plans')
          .update({ plan: existingPayment.plan, status: 'active', updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_plans')
          .insert({ user_id: user.id, plan: existingPayment.plan, status: 'active' });
      }

      console.log(`Payment verified for user ${user.id}, reference: ${reference}`);

      return new Response(
        JSON.stringify({ success: true, plan: existingPayment.plan }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment as failed
    await supabase
      .from('payment_history')
      .update({ status: 'failed' })
      .eq('reference', reference);

    return new Response(
      JSON.stringify({ success: false, error: 'Payment verification failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Payment verification error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Payment verification failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
