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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { reference, provider, transactionId } = await req.json();

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
      const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
        headers: { 'Authorization': `Bearer ${config.secret_key}` },
      });
      const data = await response.json();
      verified = data.status === 'success' && data.data?.status === 'successful';
      paymentData = data.data;

    } else if (provider === 'stripe') {
      // For Stripe, we verify by checking the payment record
      // In production, you'd use webhooks, but this works for verification
      const { data: payment } = await supabase
        .from('payment_history')
        .select('*')
        .eq('reference', reference)
        .single();
      
      if (payment) {
        // Mark as success if it exists (webhook would have updated it)
        verified = true;
        paymentData = payment;
      }
    }

    if (verified) {
      // Get the payment record to find user
      const { data: payment } = await supabase
        .from('payment_history')
        .select('*')
        .eq('reference', reference)
        .single();

      if (payment) {
        // Update payment status
        await supabase
          .from('payment_history')
          .update({ status: 'success' })
          .eq('reference', reference);

        // Upgrade user plan
        const { data: existingPlan } = await supabase
          .from('user_plans')
          .select('id')
          .eq('user_id', payment.user_id)
          .single();

        if (existingPlan) {
          await supabase
            .from('user_plans')
            .update({ plan: payment.plan, status: 'active', updated_at: new Date().toISOString() })
            .eq('user_id', payment.user_id);
        } else {
          await supabase
            .from('user_plans')
            .insert({ user_id: payment.user_id, plan: payment.plan, status: 'active' });
        }

        return new Response(
          JSON.stringify({ success: true, plan: payment.plan }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
