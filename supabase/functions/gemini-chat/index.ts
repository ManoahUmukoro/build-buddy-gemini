import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { type, messages, context } = await req.json();
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has Pro plan for AI features
    const { data: userPlan } = await supabase
      .from('user_plans')
      .select('plan, status')
      .eq('user_id', user.id)
      .maybeSingle();

    const isPro = userPlan?.plan === 'pro' && userPlan?.status === 'active';
    
    if (!isPro) {
      return new Response(
        JSON.stringify({ error: 'AI features require a Pro subscription. Upgrade to unlock AI-powered insights.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user context for context-aware AI types
    let userContext: any = null;
    const contextAwareTypes = ['finance-chat', 'journal-chat', 'life-audit', 'daily-briefing', 'journal-recap'];
    
    if (contextAwareTypes.includes(type)) {
      try {
        const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: contextData, error: contextError } = await adminSupabase
          .rpc('get_user_context', { uid: user.id });
        
        if (!contextError && contextData) {
          userContext = contextData;
          console.log('User context loaded for', type);
        }
      } catch (err) {
        console.log('Context fetch failed, continuing without:', err);
      }
    }

    let systemPrompt = '';
    let userPrompt = '';
    let maxTokens = 512; // Reduced for credit optimization
    let modelToUse = 'google/gemini-2.5-flash';

    // Build context string for injection
    const contextString = userContext ? `
Current User Context:
- Tasks Today: ${userContext.tasks?.today_completed || 0}/${userContext.tasks?.today_total || 0} completed (${userContext.tasks?.completion_rate || 0}%)
- Habits Today: ${userContext.habits?.today_completed || 0}/${userContext.habits?.today_total || 0} completed
- Mood Trend: ${userContext.mood?.trend || 'unknown'} (avg: ${userContext.mood?.recent_average || 'N/A'}/5)
- Monthly Finances: Income ${userContext.finances?.monthly_income || 0}, Expenses ${userContext.finances?.monthly_expenses || 0}, Balance ${userContext.finances?.monthly_balance || 0}
- Total Savings: ${userContext.finances?.total_savings || 0}
- Active Goals: ${userContext.goals?.length || 0}
` : '';

    // Finance-specific context for Nexer
    const financeContext = userContext ? `
Current Financial Snapshot:
- Monthly Income: ₦${(userContext.finances?.monthly_income || 0).toLocaleString()}
- Monthly Expenses: ₦${(userContext.finances?.monthly_expenses || 0).toLocaleString()}
- Net Balance: ₦${(userContext.finances?.monthly_balance || 0).toLocaleString()}
- Total Savings: ₦${(userContext.finances?.total_savings || 0).toLocaleString()}
- User has multiple bank accounts with different currencies
` : '';

    switch (type) {
      case 'smart-sort':
        systemPrompt = 'You are a productivity expert. Analyze the given tasks and return them sorted by priority and urgency. Return only a JSON array with id and text fields.';
        userPrompt = `Sort these tasks by priority: ${JSON.stringify(context?.tasks)}`;
        modelToUse = 'google/gemini-2.5-flash-lite'; // Lighter model for simple tasks
        break;
      case 'task-breakdown':
        systemPrompt = 'You are a productivity expert. Break down tasks into 3-5 actionable subtasks. Return as JSON array with text field.';
        userPrompt = `Break down this task: "${context?.taskText}"`;
        modelToUse = 'google/gemini-2.5-flash-lite';
        break;
      case 'smart-draft':
        systemPrompt = 'You are a professional writing assistant. Generate a well-written draft. Be concise and professional.';
        userPrompt = `Write a draft for: "${context?.taskText}"`;
        break;
      case 'life-audit':
        systemPrompt = `You are a life coach with deep insight into the user's patterns. Provide actionable insights and recommendations based on their actual data.
${contextString}`;
        userPrompt = `Analyze: Habits ${context?.completedHabits}/${context?.totalHabits}, Balance: ${context?.balance}, Tasks: ${context?.totalTasks}, Journal: ${context?.journalCount}`;
        break;
      case 'daily-briefing':
        systemPrompt = `You are a personal assistant with full context of the user's life. Provide a motivating and actionable daily briefing.
${contextString}`;
        userPrompt = `Daily briefing: ${context?.todayTasks} tasks, ${context?.habitsToComplete} habits left, balance: ${context?.balance}`;
        break;
      case 'finance-analysis':
        systemPrompt = 'You are a financial advisor. Analyze spending and provide insights.';
        userPrompt = `Analyze: Income ${context?.totalIncome}, Expenses ${context?.totalExpense}, Balance ${context?.balance}, Categories: ${JSON.stringify(context?.expenseData)}`;
        break;
      case 'finance-chat':
        // NEXER - Finance AI Persona
        systemPrompt = `You are Nexer, an expert financial advisor who knows the user's complete financial situation. You are friendly, knowledgeable, and give specific, actionable advice.

PERSONALITY:
- Professional but approachable
- Uses data to back up recommendations
- Asks clarifying questions when needed
- Celebrates financial wins with the user

CAPABILITIES:
- Analyze spending patterns
- Suggest budget optimizations
- Help with savings goals
- Answer personal finance questions
- Understand multi-currency accounts

${financeContext}

RULES:
- Always reference the user's actual data when giving advice
- Be specific with numbers when possible
- Keep responses concise but helpful
- If asked about non-finance topics, gently redirect to finance`;
        break;
      case 'journal-chat':
        // MEYRA - Journal/Emotional AI Persona
        systemPrompt = `You are Meyra, an emotionally intelligent companion who helps users reflect on their experiences. You are warm, empathetic, and supportive.

PERSONALITY:
- Warm and caring
- Non-judgmental and supportive
- Asks thoughtful follow-up questions
- Celebrates wins and validates struggles
- Uses gentle humor when appropriate

CAPABILITIES:
- Help process emotions and experiences
- Provide perspective on challenges
- Celebrate achievements
- Connect patterns across life areas
- Suggest journaling prompts

${contextString}

RULES:
- Always acknowledge the user's feelings
- Ask open-ended questions to encourage reflection
- Connect today's experiences to broader patterns
- Keep responses warm and human-like
- Avoid generic platitudes - be specific to their situation`;
        break;
      case 'journal-recap':
        systemPrompt = `You are Meyra, a thoughtful journaling assistant. Based on the user's activity today, generate a reflective journal entry draft they can edit. Be warm, personal, and highlight key moments.
${contextString}`;
        userPrompt = `Generate a journal entry recap for today based on this activity feed: ${JSON.stringify(context?.activityFeed || [])}. Include reflections on tasks completed, habits done, money spent, and any focus sessions.`;
        break;
      case 'auto-categorize':
        systemPrompt = 'You are a transaction categorizer. Return only the category name from this list: Income, Food, Transport, Entertainment, Utilities, Rent/Bills, Shopping, Health, Education, Savings, Cash, Transfer, Other.';
        userPrompt = `Categorize this transaction: "${context?.description}"`;
        modelToUse = 'google/gemini-2.5-flash-lite'; // Lighter model for simple classification
        maxTokens = 50;
        break;
      case 'generate-schedule':
        systemPrompt = 'You are a productivity expert. Generate a daily schedule.';
        userPrompt = `Generate 4-5 tasks for: "${context?.prompt}". Return as JSON array with text property.`;
        modelToUse = 'google/gemini-2.5-flash-lite';
        break;
      case 'generate-habits':
        systemPrompt = 'You are a habit formation expert. Generate specific, actionable habits.';
        userPrompt = `Generate habits for goal: "${context?.goal}" because: "${context?.why}". Return as JSON array with name property.`;
        modelToUse = 'google/gemini-2.5-flash-lite';
        break;
      case 'weekly-report':
        systemPrompt = 'You are a personal development coach. Analyze entries and provide insights.';
        userPrompt = `Analyze journal entries: ${JSON.stringify(context?.entries)}`;
        break;
      default:
        systemPrompt = 'You are a helpful AI assistant.';
    }

    // Build messages for Lovable AI API (OpenAI-compatible format)
    const apiMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    if (messages && messages.length > 0) {
      for (const msg of messages) {
        apiMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      }
    }

    if (userPrompt) {
      apiMessages.push({ role: 'user', content: userPrompt });
    }

    console.log('Calling Lovable AI with type:', type, 'model:', modelToUse, 'has context:', !!userContext);

    // Call Lovable AI gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI rate limit reached. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable. Please try again.' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log('Lovable AI response received for type:', type);

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in gemini-chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
