import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature, verif-hash, stripe-signature',
};

// Helper to create HMAC SHA512 hash
async function createHmacSha512(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper to create HMAC SHA256 hash for Stripe
async function createHmacSha256(key: string, message: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return new Uint8Array(signature);
}

// Verify Stripe webhook signature
async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = signatureHeader.split(',');
    let timestamp = '';
    let signatures: string[] = [];
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') signatures.push(value);
    }
    
    if (!timestamp || signatures.length === 0) {
      console.error('Missing timestamp or signature in Stripe header');
      return false;
    }
    
    // Check timestamp tolerance (5 minutes)
    const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp);
    if (timestampAge > 300) {
      console.error('Stripe webhook timestamp too old:', timestampAge, 'seconds');
      return false;
    }
    
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSig = await createHmacSha256(secret, signedPayload);
    const expectedSigHex = Array.from(expectedSig)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signatures.some(sig => sig === expectedSigHex);
  } catch (error) {
    console.error('Stripe signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.text();
    
    // Get payment provider secrets for signature verification
    const { data: providerSettings } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'payment_providers')
      .single();

    const providers = providerSettings?.value as Record<string, any>;

    // Determine provider from headers
    const paystackSignature = req.headers.get('x-paystack-signature');
    const flutterwaveHash = req.headers.get('verif-hash');
    const stripeSignature = req.headers.get('stripe-signature');

    let provider = '';
    let reference = '';
    let status = '';
    let userId = '';
    let planId = '';
    let signatureValid = false;

    // Verify Paystack webhook signature
    if (paystackSignature) {
      provider = 'paystack';
      const paystackSecretKey = providers?.paystack?.secret_key;
      
      if (!paystackSecretKey) {
        console.error('Paystack secret key not configured');
        return new Response(
          JSON.stringify({ error: 'Paystack not configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Verify HMAC SHA512 signature
      const expectedSignature = await createHmacSha512(paystackSecretKey, body);
      signatureValid = expectedSignature === paystackSignature;
      
      if (!signatureValid) {
        console.error('Invalid Paystack signature');
        console.log('Expected:', expectedSignature.substring(0, 20) + '...');
        console.log('Received:', paystackSignature.substring(0, 20) + '...');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const data = JSON.parse(body);
      if (data.event === 'charge.success') {
        reference = data.data.reference;
        status = 'success';
        userId = data.data.metadata?.userId;
        planId = data.data.metadata?.planId;
      }
      
    // Verify Flutterwave webhook hash
    } else if (flutterwaveHash) {
      provider = 'flutterwave';
      const flutterwaveSecretHash = providers?.flutterwave?.secret_hash;
      
      if (!flutterwaveSecretHash) {
        console.error('Flutterwave secret hash not configured');
        return new Response(
          JSON.stringify({ error: 'Flutterwave not configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Flutterwave uses a simple hash comparison
      signatureValid = flutterwaveHash === flutterwaveSecretHash;
      
      if (!signatureValid) {
        console.error('Invalid Flutterwave verification hash');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const data = JSON.parse(body);
      if (data.event === 'charge.completed' && data.data.status === 'successful') {
        reference = data.data.tx_ref;
        status = 'success';
        userId = data.data.meta?.userId;
        planId = data.data.meta?.planId;
      }
      
    // Verify Stripe webhook signature
    } else if (stripeSignature) {
      provider = 'stripe';
      const stripeWebhookSecret = providers?.stripe?.webhook_secret;
      
      if (!stripeWebhookSecret) {
        console.error('Stripe webhook secret not configured');
        return new Response(
          JSON.stringify({ error: 'Stripe webhook not configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      signatureValid = await verifyStripeSignature(body, stripeSignature, stripeWebhookSecret);
      
      if (!signatureValid) {
        console.error('Invalid Stripe signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const data = JSON.parse(body);
      if (data.type === 'checkout.session.completed') {
        reference = data.data.object.metadata?.reference;
        status = 'success';
        userId = data.data.object.metadata?.userId;
        planId = data.data.object.metadata?.planId;
      }
      
    } else {
      // No recognized provider signature header
      console.error('No valid provider signature header found');
      return new Response(
        JSON.stringify({ error: 'Missing provider signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Webhook received from ${provider}, signature valid: ${signatureValid}, status: ${status}, reference: ${reference}`);

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