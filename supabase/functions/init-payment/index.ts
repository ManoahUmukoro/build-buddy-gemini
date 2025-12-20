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

    const { provider, planId, userId, email, amount, currency, callbackUrl } = await req.json();

    // Get payment provider settings
    const { data: providerSettings } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'payment_providers')
      .single();

    const providers = providerSettings?.value as Record<string, any>;
    const config = providers?.[provider];

    if (!config?.enabled || !config?.secret_key) {
      return new Response(
        JSON.stringify({ error: `${provider} is not configured or enabled` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let paymentUrl = '';
    let reference = '';

    if (provider === 'paystack') {
      reference = `ps_${Date.now()}_${userId.slice(0, 8)}`;
      
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.secret_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: amount * 100, // Paystack uses kobo
          reference,
          callback_url: callbackUrl,
          metadata: { userId, planId },
        }),
      });

      const data = await response.json();
      if (!data.status) {
        throw new Error(data.message || 'Paystack initialization failed');
      }
      paymentUrl = data.data.authorization_url;

    } else if (provider === 'flutterwave') {
      reference = `fw_${Date.now()}_${userId.slice(0, 8)}`;
      
      const response = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.secret_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tx_ref: reference,
          amount,
          currency,
          redirect_url: callbackUrl,
          customer: { email },
          meta: { userId, planId },
          customizations: {
            title: 'LifeOS Pro Subscription',
            description: 'Upgrade to Pro plan',
          },
        }),
      });

      const data = await response.json();
      if (data.status !== 'success') {
        throw new Error(data.message || 'Flutterwave initialization failed');
      }
      paymentUrl = data.data.link;

    } else if (provider === 'stripe') {
      // For Stripe, we create a checkout session
      reference = `st_${Date.now()}_${userId.slice(0, 8)}`;
      
      const params = new URLSearchParams();
      params.append('mode', 'payment');
      params.append('success_url', `${callbackUrl}?reference=${reference}&provider=stripe`);
      params.append('cancel_url', `${callbackUrl}?cancelled=true`);
      params.append('customer_email', email);
      params.append('line_items[0][price_data][currency]', currency.toLowerCase());
      params.append('line_items[0][price_data][product_data][name]', 'LifeOS Pro Subscription');
      params.append('line_items[0][price_data][unit_amount]', String(Math.round(amount * 100)));
      params.append('line_items[0][quantity]', '1');
      params.append('metadata[userId]', userId);
      params.append('metadata[planId]', planId);
      params.append('metadata[reference]', reference);

      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.secret_key}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || 'Stripe initialization failed');
      }
      paymentUrl = data.url;
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }

    // Store pending payment
    await supabase.from('payment_history').insert({
      user_id: userId,
      reference,
      amount,
      currency,
      plan: planId,
      payment_provider: provider,
      status: 'pending',
    });

    return new Response(
      JSON.stringify({ paymentUrl, reference }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Payment init error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Payment initialization failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
