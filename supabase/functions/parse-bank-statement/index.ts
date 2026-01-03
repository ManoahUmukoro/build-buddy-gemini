import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedTransaction {
  date: string;
  amount: number;
  type: "income" | "expense";
  description: string;
  category?: string;
  isDuplicate?: boolean;
}

// Category mapping for AI results
const VALID_CATEGORIES = [
  'Income', 'Food', 'Transport', 'Entertainment', 'Utilities', 
  'Rent/Bills', 'Shopping', 'Health', 'Education', 'Savings', 
  'Cash', 'Transfer', 'Other'
];

async function parseWithAI(content: string, lovableApiKey: string): Promise<ParsedTransaction[]> {
  console.log("Parsing bank statement with AI...");
  
  const systemPrompt = `You are a bank statement parser expert. Your job is to extract transactions from bank statement text.

IMPORTANT RULES:
1. Extract ALL transactions you can identify
2. For each transaction, determine:
   - date: Format as YYYY-MM-DD
   - amount: Always a positive number
   - type: "income" for credits/deposits, "expense" for debits/withdrawals
   - description: Clean description of the transaction
   - category: One of: Income, Food, Transport, Entertainment, Utilities, Rent/Bills, Shopping, Health, Education, Savings, Cash, Transfer, Other

3. Look for patterns like:
   - Credit/CR = income
   - Debit/DR = expense
   - POS, ATM, Transfer to = expense
   - Transfer from, Deposit, Salary = income

4. Return ONLY valid JSON array, no other text

Example output:
[
  {"date": "2024-01-15", "amount": 5000, "type": "income", "description": "Salary", "category": "Income"},
  {"date": "2024-01-16", "amount": 200, "type": "expense", "description": "POS MTN Airtime", "category": "Utilities"}
]`;

  const userPrompt = `Parse this bank statement and extract all transactions as a JSON array:

${content.substring(0, 15000)}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI parsing error:', response.status, errorText);
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log("AI response received, parsing JSON...");
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    // Try to find JSON array in the response
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }
    
    const transactions: ParsedTransaction[] = JSON.parse(jsonStr);
    
    // Validate and clean transactions
    return transactions
      .filter(t => t.date && t.amount && t.type && t.description)
      .map(t => ({
        date: normalizeDate(t.date),
        amount: Math.abs(Number(t.amount)),
        type: t.type === 'income' ? 'income' : 'expense',
        description: String(t.description).substring(0, 200),
        category: VALID_CATEGORIES.includes(t.category || '') ? t.category : 'Other',
      }));
      
  } catch (error) {
    console.error('AI parsing failed:', error);
    throw error;
  }
}

function normalizeDate(dateStr: string): string {
  // Handle various date formats
  const cleanDate = String(dateStr).replace(/['"]/g, "").trim();
  
  // YYYY-MM-DD already correct
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return cleanDate;
  }
  
  // DD-MM-YYYY or DD/MM/YYYY
  let match = cleanDate.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    let year = match[3];
    if (year.length === 2) {
      year = parseInt(year) > 50 ? "19" + year : "20" + year;
    }
    return `${year}-${month}-${day}`;
  }

  // Default to today
  return new Date().toISOString().split("T")[0];
}

async function checkDuplicates(
  supabase: any,
  userId: string,
  bankAccountId: string,
  transactions: ParsedTransaction[]
): Promise<ParsedTransaction[]> {
  // Fetch existing transactions for this account
  const { data: existing } = await supabase
    .from("transactions")
    .select("date, amount, description")
    .eq("user_id", userId)
    .eq("bank_account_id", bankAccountId);

  const existingSet = new Set(
    (existing || []).map((t: any) => `${t.date}-${t.amount}-${t.description?.substring(0, 50)}`)
  );

  return transactions.map(t => ({
    ...t,
    isDuplicate: existingSet.has(`${t.date}-${t.amount}-${t.description?.substring(0, 50)}`),
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check Pro subscription
    const { data: userPlan } = await supabase
      .from('user_plans')
      .select('plan, status')
      .eq('user_id', user.id)
      .maybeSingle();

    const isPro = userPlan?.plan === 'pro' && userPlan?.status === 'active';
    
    if (!isPro) {
      return new Response(
        JSON.stringify({ error: 'Smart Statement Import is a Pro feature. Upgrade to unlock AI-powered bank statement parsing.' }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { fileContent, fileName, fileType, bankAccountId } = await req.json();

    if (!fileContent || !bankAccountId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Parsing bank statement with AI: ${fileName} (type: ${fileType}) for account ${bankAccountId}`);

    // Decode base64 content
    let decodedContent: string;
    try {
      decodedContent = atob(fileContent);
    } catch (e) {
      console.error("Failed to decode base64:", e);
      return new Response(JSON.stringify({ error: "Invalid file encoding" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse with AI
    let transactions: ParsedTransaction[] = [];
    try {
      transactions = await parseWithAI(decodedContent, lovableApiKey);
    } catch (aiError) {
      console.error("AI parsing failed:", aiError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse bank statement. Please ensure the file contains readable transaction data.",
          details: aiError instanceof Error ? aiError.message : "Unknown error"
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`AI parsed ${transactions.length} transactions`);

    if (transactions.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No transactions found. Please ensure the file contains bank statement data.",
          transactions: [],
          totalCount: 0,
          duplicateCount: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicates
    const withDuplicates = await checkDuplicates(supabase, user.id, bankAccountId, transactions);
    const duplicateCount = withDuplicates.filter(t => t.isDuplicate).length;

    return new Response(
      JSON.stringify({
        transactions: withDuplicates,
        duplicateCount,
        totalCount: transactions.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error parsing bank statement:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to parse bank statement", details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});