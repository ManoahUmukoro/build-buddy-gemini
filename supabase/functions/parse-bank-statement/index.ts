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
    /(\d{2}[-\/]\w{3}[-\/]\d{4})/gi, // DD-Mon-YYYY
    /(\d{1,2}\s+\w{3,9}\s+\d{4})/gi, // D Month YYYY or DD Month YYYY
  ],
  // Amount patterns
  amountPatterns: [
    /(?:NGN|₦|N)?\s*([\d,]+\.?\d*)/gi,
    /([\d,]+\.\d{2})/g,
  ],
  // Credit/Debit indicators
  creditIndicators: ["credit", "cr", "deposit", "inflow", "transfer from", "received", "incoming", "refund"],
  debitIndicators: ["debit", "dr", "withdrawal", "outflow", "transfer to", "payment", "pos", "atm", "purchase", "charge"],
};

// OPay specific patterns
const OPAY_PATTERNS = {
  // OPay statement line pattern: looks for transaction rows
  // Format: Date/Time | Reference | Description | Status | Amount (CR/DR)
  transactionLine: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(\d{2}:\d{2}:\d{2})?\s*([A-Z0-9]+)?\s+(.+?)\s+(Successful|Failed|Pending)?\s*([CDR]{1,2})?\s*([\d,]+\.?\d*)/gi,
  
  // Amount with CR/DR suffix
  amountWithType: /([\d,]+\.?\d*)\s*(CR|DR|C|D)?$/i,
  
  // Reference pattern
  reference: /[A-Z]{2,}\d{10,}/g,
};

// Kuda specific patterns
const KUDA_PATTERNS = {
  transactionLine: /(\d{2}[\/\-]\w{3}[\/\-]\d{4})\s+(.+?)\s+([\d,]+\.?\d*)\s*(CR|DR)?/gi,
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
    h.includes("amount") && !h.includes("credit") && !h.includes("debit")
  );
  const creditCol = headers.findIndex(h => 
    h.includes("credit") || h.includes("deposit") || h.includes("inflow")
  );
  const debitCol = headers.findIndex(h => 
    h.includes("debit") || h.includes("withdrawal") || h.includes("outflow")
  );
  const typeCol = headers.findIndex(h => 
    h.includes("type") || h.includes("dr/cr") || h.includes("cr/dr")
  );

  console.log(`CSV Headers found: date=${dateCol}, desc=${descCol}, amount=${amountCol}, credit=${creditCol}, debit=${debitCol}, type=${typeCol}`);

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
        type = typeVal.includes("cr") || BANK_PATTERNS.creditIndicators.some(t => typeVal.includes(t)) ? "income" : "expense";
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

function parseOPayStatement(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = content.split("\n");
  
  console.log(`Parsing OPay statement with ${lines.length} lines`);
  
  // OPay statements have a specific format:
  // Date/Time | Reference | Description | Status | Amount (with CR/DR)
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Skip header lines and summary sections
    if (line.includes("Transaction History") || 
        line.includes("Statement of Account") ||
        line.includes("Opening Balance") ||
        line.includes("Closing Balance") ||
        line.includes("Total Credit") ||
        line.includes("Total Debit") ||
        line.includes("Date/Time")) {
      continue;
    }
    
    // Try to extract date from the line
    let date = "";
    const datePatterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /(\d{1,2}\s+\w{3,9}\s+\d{4})/i,
    ];
    
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        date = normalizeDate(match[1]);
        break;
      }
    }
    
    if (!date) continue;
    
    // Look for amount with CR/DR indicator
    let amount = 0;
    let type: "income" | "expense" = "expense";
    
    // Pattern: amount followed by CR or DR
    const crdrMatch = line.match(/([\d,]+\.?\d{0,2})\s*(CR|DR)$/i);
    if (crdrMatch) {
      amount = parseAmount(crdrMatch[1]);
      type = crdrMatch[2].toUpperCase() === "CR" ? "income" : "expense";
    } else {
      // Try to find any amount in the line
      const amounts = line.match(/[\d,]+\.?\d{2}/g);
      if (amounts && amounts.length > 0) {
        // Usually the last amount is the transaction amount
        amount = parseAmount(amounts[amounts.length - 1]);
        // Determine type from description
        type = determineTypeFromDescription(line);
      }
    }
    
    if (amount > 0) {
      // Extract description by removing date and amount patterns
      let description = line
        .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, "")
        .replace(/\d{2}:\d{2}:\d{2}/g, "")
        .replace(/[\d,]+\.?\d{0,2}\s*(CR|DR)?$/gi, "")
        .replace(/Successful|Failed|Pending/gi, "")
        .replace(/[A-Z]{2,}\d{10,}/g, "") // Remove reference numbers
        .trim();
      
      // Clean up extra spaces
      description = description.replace(/\s+/g, " ").trim();
      
      if (description.length < 3) {
        description = "Bank Transaction";
      }
      
      transactions.push({
        date,
        amount,
        type,
        description,
        category: guessCategory(description, type),
      });
    }
  }
  
  console.log(`OPay parser found ${transactions.length} transactions`);
  return transactions;
}

function parseTextContent(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = content.split("\n");
  
  console.log(`Parsing text content with ${lines.length} lines`);
  
  // First, try OPay-specific parsing
  const opayTransactions = parseOPayStatement(content);
  if (opayTransactions.length > 0) {
    return opayTransactions;
  }

  // Generic text parsing for other banks
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

    // Try to extract amount with CR/DR
    let amount = 0;
    let type: "income" | "expense" = "expense";
    
    const crdrMatch = line.match(/([\d,]+\.?\d{0,2})\s*(CR|DR)$/i);
    if (crdrMatch) {
      amount = parseAmount(crdrMatch[1]);
      type = crdrMatch[2].toUpperCase() === "CR" ? "income" : "expense";
    } else {
      for (const pattern of BANK_PATTERNS.amountPatterns) {
        const matches = line.match(pattern);
        if (matches) {
          for (const m of matches) {
            const parsed = parseAmount(m);
            if (parsed > amount) amount = parsed;
          }
        }
      }
      type = determineTypeFromDescription(line);
    }

    if (date && amount > 0) {
      transactions.push({
        date,
        amount,
        type,
        description: extractDescription(line),
        category: guessCategory(line, type),
      });
    }
  }
  
  console.log(`Text parser found ${transactions.length} transactions`);
  return transactions;
}

function parsePDFContent(content: string): ParsedTransaction[] {
  // For PDF, the content comes as raw bytes when decoded from base64
  // We need to extract readable text from it
  
  console.log("Attempting to parse PDF content...");
  
  // Try to find readable text patterns in the PDF
  // PDFs store text in various ways, but we can try to extract it
  
  let textContent = "";
  
  // Try to extract text between BT (begin text) and ET (end text) markers
  const textBlocks = content.match(/BT[\s\S]*?ET/g);
  if (textBlocks) {
    for (const block of textBlocks) {
      // Extract text from Tj and TJ operators
      const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g);
      if (tjMatches) {
        for (const tj of tjMatches) {
          const text = tj.match(/\(([^)]*)\)/);
          if (text) textContent += text[1] + " ";
        }
      }
    }
  }
  
  // Also try to find any readable ASCII sequences
  const readableChunks: string[] = [];
  let currentChunk = "";
  
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    // Check if character is printable ASCII (32-126) or common whitespace
    if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
      currentChunk += content[i];
    } else {
      if (currentChunk.length > 5) {
        readableChunks.push(currentChunk.trim());
      }
      currentChunk = "";
    }
  }
  if (currentChunk.length > 5) {
    readableChunks.push(currentChunk.trim());
  }
  
  // Combine extracted text
  const combinedText = textContent + "\n" + readableChunks.join("\n");
  
  console.log(`Extracted ${combinedText.length} characters from PDF`);
  
  if (combinedText.length > 100) {
    return parseTextContent(combinedText);
  }
  
  // If we couldn't extract much text, try the raw content
  return parseTextContent(content);
}

function normalizeDate(dateStr: string): string {
  // Try to parse various date formats and return YYYY-MM-DD
  const cleanDate = dateStr.replace(/['"]/g, "").trim();
  
  // DD-MM-YYYY or DD/MM/YYYY or DD-MM-YY
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

  // YYYY-MM-DD
  match = cleanDate.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }

  // DD-Mon-YYYY or D Month YYYY
  match = cleanDate.match(/(\d{1,2})[-\/\s](\w{3,9})[-\/\s](\d{4})/i);
  if (match) {
    const months: Record<string, string> = {
      jan: "01", january: "01",
      feb: "02", february: "02",
      mar: "03", march: "03",
      apr: "04", april: "04",
      may: "05",
      jun: "06", june: "06",
      jul: "07", july: "07",
      aug: "08", august: "08",
      sep: "09", september: "09",
      oct: "10", october: "10",
      nov: "11", november: "11",
      dec: "12", december: "12",
    };
    const monthKey = match[2].toLowerCase().substring(0, 3);
    const month = months[monthKey] || months[match[2].toLowerCase()] || "01";
    return `${match[3]}-${month}-${match[1].padStart(2, "0")}`;
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
  
  // Check for credit indicators
  if (BANK_PATTERNS.creditIndicators.some(i => lower.includes(i))) {
    return "income";
  }
  
  // Check for specific income keywords
  if (lower.includes("salary") || 
      lower.includes("wage") || 
      lower.includes("bonus") ||
      lower.includes("from ") ||
      lower.includes("inward")) {
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
  desc = desc
    .replace(/[₦NGN]/gi, "")
    .replace(/\d{2}:\d{2}:\d{2}/g, "")
    .replace(/(CR|DR)$/gi, "")
    .replace(/Successful|Failed|Pending/gi, "")
    .trim();
  
  // Clean up multiple spaces
  desc = desc.replace(/\s+/g, " ").trim();
  
  return desc.substring(0, 100) || "Bank Transaction";
}

function guessCategory(description: string, type: "income" | "expense"): string {
  if (type === "income") return "Income";
  
  const lower = description.toLowerCase();
  
  if (lower.includes("food") || lower.includes("restaurant") || lower.includes("eat") || lower.includes("lunch") || lower.includes("dinner")) return "Food";
  if (lower.includes("uber") || lower.includes("bolt") || lower.includes("transport") || lower.includes("fuel") || lower.includes("taxi")) return "Transport";
  if (lower.includes("netflix") || lower.includes("spotify") || lower.includes("entertainment") || lower.includes("movie")) return "Entertainment";
  if (lower.includes("airtime") || lower.includes("data") || lower.includes("mtn") || lower.includes("glo") || lower.includes("airtel") || lower.includes("9mobile")) return "Utilities";
  if (lower.includes("rent") || lower.includes("electricity") || lower.includes("nepa") || lower.includes("power") || lower.includes("bill")) return "Rent/Bills";
  if (lower.includes("shop") || lower.includes("store") || lower.includes("market") || lower.includes("mall") || lower.includes("buy")) return "Shopping";
  if (lower.includes("pharmacy") || lower.includes("hospital") || lower.includes("clinic") || lower.includes("medicine") || lower.includes("health")) return "Health";
  if (lower.includes("pos") || lower.includes("atm") || lower.includes("withdrawal")) return "Cash";
  if (lower.includes("transfer")) return "Transfer";
  
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

    console.log(`Parsing bank statement: ${fileName} (type: ${fileType}) for account ${bankAccountId}`);

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
    
    let transactions: ParsedTransaction[] = [];

    // Parse based on file type
    const ext = fileName?.split(".").pop()?.toLowerCase() || fileType?.split("/").pop() || "";
    console.log(`File extension detected: ${ext}`);
    
    if (ext === "csv" || fileType?.includes("csv")) {
      console.log("Parsing as CSV");
      transactions = parseCSV(decodedContent);
    } else if (ext === "pdf" || fileType?.includes("pdf")) {
      console.log("Parsing as PDF");
      transactions = parsePDFContent(decodedContent);
    } else if (ext === "xls" || ext === "xlsx" || fileType?.includes("excel") || fileType?.includes("spreadsheet")) {
      // For Excel, try CSV parsing (in case it's a simple format)
      console.log("Parsing as Excel (attempting CSV extraction)");
      transactions = parseCSV(decodedContent);
      if (transactions.length === 0) {
        transactions = parseTextContent(decodedContent);
      }
    } else {
      // Try all parsers
      console.log("Unknown format, trying all parsers");
      transactions = parseCSV(decodedContent);
      if (transactions.length === 0) {
        transactions = parseTextContent(decodedContent);
      }
    }

    console.log(`Parsed ${transactions.length} transactions total`);

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
