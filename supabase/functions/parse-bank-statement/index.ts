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

// Common Nigerian bank statement patterns
const BANK_PATTERNS = {
  // Date patterns
  datePatterns: [
    /(\d{2}[-\/]\d{2}[-\/]\d{4})/g, // DD-MM-YYYY or DD/MM/YYYY
    /(\d{4}[-\/]\d{2}[-\/]\d{2})/g, // YYYY-MM-DD
    /(\d{2}[-\/]\w{3}[-\/]\d{4})/g, // DD-Mon-YYYY
  ],
  // Amount patterns
  amountPatterns: [
    /(?:NGN|₦|N)?\s*([\d,]+\.?\d*)/gi,
    /([\d,]+\.\d{2})/g,
  ],
  // Credit/Debit indicators
  creditIndicators: ["credit", "cr", "deposit", "inflow", "transfer from", "received"],
  debitIndicators: ["debit", "dr", "withdrawal", "outflow", "transfer to", "payment", "pos", "atm"],
};

function parseCSV(content: string): ParsedTransaction[] {
  const lines = content.split("\n").filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
  const transactions: ParsedTransaction[] = [];

  // Find column indices
  const dateCol = headers.findIndex(h => 
    h.includes("date") || h.includes("trans") || h.includes("value")
  );
  const descCol = headers.findIndex(h => 
    h.includes("desc") || h.includes("narration") || h.includes("details") || h.includes("particular")
  );
  const amountCol = headers.findIndex(h => 
    h.includes("amount") || h.includes("value")
  );
  const creditCol = headers.findIndex(h => 
    h.includes("credit") || h.includes("deposit") || h.includes("inflow")
  );
  const debitCol = headers.findIndex(h => 
    h.includes("debit") || h.includes("withdrawal") || h.includes("outflow")
  );
  const typeCol = headers.findIndex(h => 
    h.includes("type") || h.includes("dr/cr")
  );

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/"/g, ""));
    if (values.length < 2) continue;

    let date = "";
    let amount = 0;
    let type: "income" | "expense" = "expense";
    let description = "";

    // Extract date
    if (dateCol >= 0 && values[dateCol]) {
      date = normalizeDate(values[dateCol]);
    }

    // Extract description
    if (descCol >= 0 && values[descCol]) {
      description = values[descCol];
    }

    // Extract amount and type
    if (creditCol >= 0 && debitCol >= 0) {
      const credit = parseAmount(values[creditCol]);
      const debit = parseAmount(values[debitCol]);
      if (credit > 0) {
        amount = credit;
        type = "income";
      } else if (debit > 0) {
        amount = debit;
        type = "expense";
      }
    } else if (amountCol >= 0) {
      amount = parseAmount(values[amountCol]);
      // Determine type from description or type column
      if (typeCol >= 0) {
        const typeVal = values[typeCol].toLowerCase();
        type = BANK_PATTERNS.creditIndicators.some(t => typeVal.includes(t)) ? "income" : "expense";
      } else {
        type = determineTypeFromDescription(description);
      }
    }

    if (date && amount > 0) {
      transactions.push({
        date,
        amount,
        type,
        description: description || "Bank Transaction",
        category: guessCategory(description, type),
      });
    }
  }

  return transactions;
}

function parseTextContent(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;

    // Try to extract date
    let date = "";
    for (const pattern of BANK_PATTERNS.datePatterns) {
      const match = line.match(pattern);
      if (match) {
        date = normalizeDate(match[1]);
        break;
      }
    }

    // Try to extract amount
    let amount = 0;
    for (const pattern of BANK_PATTERNS.amountPatterns) {
      const matches = line.match(pattern);
      if (matches) {
        for (const m of matches) {
          const parsed = parseAmount(m);
          if (parsed > amount) amount = parsed;
        }
      }
    }

    if (date && amount > 0) {
      const type = determineTypeFromDescription(line);
      transactions.push({
        date,
        amount,
        type,
        description: extractDescription(line),
        category: guessCategory(line, type),
      });
    }
  }

  return transactions;
}

function normalizeDate(dateStr: string): string {
  // Try to parse various date formats and return YYYY-MM-DD
  const cleanDate = dateStr.replace(/['"]/g, "").trim();
  
  // DD-MM-YYYY or DD/MM/YYYY
  let match = cleanDate.match(/(\d{2})[-\/](\d{2})[-\/](\d{4})/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  // YYYY-MM-DD
  match = cleanDate.match(/(\d{4})[-\/](\d{2})[-\/](\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  // DD-Mon-YYYY
  match = cleanDate.match(/(\d{2})[-\/](\w{3})[-\/](\d{4})/i);
  if (match) {
    const months: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };
    const month = months[match[2].toLowerCase()] || "01";
    return `${match[3]}-${month}-${match[1]}`;
  }

  return new Date().toISOString().split("T")[0];
}

function parseAmount(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[₦NGN,\s]/gi, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

function determineTypeFromDescription(desc: string): "income" | "expense" {
  const lower = desc.toLowerCase();
  if (BANK_PATTERNS.creditIndicators.some(i => lower.includes(i))) {
    return "income";
  }
  return "expense";
}

function extractDescription(line: string): string {
  // Remove dates and amounts, keep the rest as description
  let desc = line;
  for (const pattern of BANK_PATTERNS.datePatterns) {
    desc = desc.replace(pattern, "");
  }
  for (const pattern of BANK_PATTERNS.amountPatterns) {
    desc = desc.replace(pattern, "");
  }
  desc = desc.replace(/[₦NGN]/gi, "").trim();
  return desc.substring(0, 100) || "Bank Transaction";
}

function guessCategory(description: string, type: "income" | "expense"): string {
  if (type === "income") return "Income";
  
  const lower = description.toLowerCase();
  
  if (lower.includes("food") || lower.includes("restaurant") || lower.includes("eat")) return "Food";
  if (lower.includes("uber") || lower.includes("bolt") || lower.includes("transport") || lower.includes("fuel")) return "Transport";
  if (lower.includes("netflix") || lower.includes("spotify") || lower.includes("subscription")) return "Entertainment";
  if (lower.includes("airtime") || lower.includes("data") || lower.includes("mtn") || lower.includes("glo")) return "Utilities";
  if (lower.includes("rent") || lower.includes("electricity") || lower.includes("nepa")) return "Rent/Bills";
  if (lower.includes("shop") || lower.includes("store") || lower.includes("market")) return "Shopping";
  if (lower.includes("pharmacy") || lower.includes("hospital") || lower.includes("clinic")) return "Health";
  
  return "Other";
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileContent, fileName, fileType, bankAccountId } = await req.json();

    if (!fileContent || !bankAccountId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Parsing bank statement: ${fileName} for account ${bankAccountId}`);

    // Decode base64 content
    const decodedContent = atob(fileContent);
    
    let transactions: ParsedTransaction[] = [];

    // Parse based on file type
    const ext = fileName?.split(".").pop()?.toLowerCase() || fileType;
    
    if (ext === "csv" || fileType?.includes("csv")) {
      transactions = parseCSV(decodedContent);
    } else if (ext === "pdf" || fileType?.includes("pdf")) {
      // For PDF, we extract text content (simplified - in production use PDF library)
      // This is a basic text extraction, real implementation would use pdf-parse
      transactions = parseTextContent(decodedContent);
    } else {
      // Try CSV parsing as default
      transactions = parseCSV(decodedContent);
      if (transactions.length === 0) {
        transactions = parseTextContent(decodedContent);
      }
    }

    console.log(`Parsed ${transactions.length} transactions`);

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
