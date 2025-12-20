import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature, verif-hash',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.text();
    const data = JSON.parse(body);

    // Determine provider from headers or payload
    const paystackSignature = req.headers.get('x-paystack-signature');
    const flutterwaveHash = req.headers.get('verif-hash');
    const stripeSignature = req.headers.get('stripe-signature');

    let provider = '';
    let reference = '';
    let status = '';
    let userId = '';
    let planId = '';

    if (paystackSignature) {
      provider = 'paystack';
      if (data.event === 'charge.success') {
        reference = data.data.reference;
        status = 'success';
        userId = data.data.metadata?.userId;
        planId = data.data.metadata?.planId;
      }
    } else if (flutterwaveHash) {
      provider = 'flutterwave';
      if (data.event === 'charge.completed' && data.data.status === 'successful') {
        reference = data.data.tx_ref;
        status = 'success';
        userId = data.data.meta?.userId;
        planId = data.data.meta?.planId;
      }
    } else if (stripeSignature || data.type?.startsWith('checkout.session')) {
      provider = 'stripe';
      if (data.type === 'checkout.session.completed') {
        reference = data.data.object.metadata?.reference;
        status = 'success';
        userId = data.data.object.metadata?.userId;
        planId = data.data.object.metadata?.planId;
      }
    }

    if (status === 'success' && reference) {
      // Update payment status
      await supabase
        .from('payment_history')
        .update({ status: 'success' })
        .eq('reference', reference);

      // Get user from payment if not in webhook
      if (!userId) {
        const { data: payment } = await supabase
          .from('payment_history')
          .select('user_id, plan')
          .eq('reference', reference)
          .single();
        
        if (payment) {
          userId = payment.user_id;
          planId = payment.plan;
        }
      }

      if (userId) {
        // Upgrade user plan
        const { data: existingPlan } = await supabase
          .from('user_plans')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (existingPlan) {
          await supabase
            .from('user_plans')
            .update({ plan: planId || 'pro', status: 'active', updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        } else {
          await supabase
            .from('user_plans')
            .insert({ user_id: userId, plan: planId || 'pro', status: 'active' });
        }

        console.log(`User ${userId} upgraded to ${planId || 'pro'} via ${provider}`);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
