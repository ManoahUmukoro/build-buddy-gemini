import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache exchange rates for 1 hour
let cachedRates: Record<string, number> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = Date.now();

    // Return cached rates if still valid
    if (cachedRates && now - cacheTimestamp < CACHE_DURATION_MS) {
      return new Response(JSON.stringify({ rates: cachedRates, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch fresh rates from exchangerate-api (free tier - 1500 requests/month)
    // Using NGN as base since that's the primary currency
    const response = await fetch(
      "https://api.exchangerate-api.com/v4/latest/NGN"
    );

    if (!response.ok) {
      console.error("Exchange rate API error:", response.status);
      // Return fallback rates if API fails
      const fallbackRates = { NGN: 1, USD: 0.000625, GBP: 0.0005, EUR: 0.00057 };
      return new Response(JSON.stringify({ rates: fallbackRates, fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    // Create rates relative to NGN (1 NGN = X other currency)
    const rates: Record<string, number> = {
      NGN: 1,
      USD: data.rates?.USD || 0.000625,
      GBP: data.rates?.GBP || 0.0005,
      EUR: data.rates?.EUR || 0.00057,
    };

    // Update cache
    cachedRates = rates;
    cacheTimestamp = now;

    console.log("Fetched fresh exchange rates:", rates);

    return new Response(JSON.stringify({ rates, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("get-exchange-rates error:", error);
    // Return fallback rates on error
    const fallbackRates = { NGN: 1, USD: 0.000625, GBP: 0.0005, EUR: 0.00057 };
    return new Response(JSON.stringify({ rates: fallbackRates, fallback: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
