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
    
    // Get user's Gemini API key from database
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

    // Get user's Gemini API key from settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('gemini_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiApiKey = settings?.gemini_api_key;
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'No Gemini API key configured. Please add your API key in Settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user context for context-aware AI types
    let userContext: any = null;
    const contextAwareTypes = ['finance-chat', 'journal-chat', 'life-audit', 'daily-briefing', 'journal-recap'];
    
    if (contextAwareTypes.includes(type)) {
      try {
        // Use service role client to call the function
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

    switch (type) {
      case 'smart-sort':
        systemPrompt = 'You are a productivity expert. Analyze the given tasks and return them sorted by priority and urgency. Return only a JSON array with id and text fields.';
        userPrompt = `Sort these tasks by priority: ${JSON.stringify(context?.tasks)}`;
        break;
      case 'task-breakdown':
        systemPrompt = 'You are a productivity expert. Break down tasks into 3-5 actionable subtasks. Return as JSON array with text field.';
        userPrompt = `Break down this task: "${context?.taskText}"`;
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
        systemPrompt = `You are a friendly financial advisor who knows the user's complete financial situation. Answer personal finance questions with specific, actionable advice.
${contextString}`;
        break;
      case 'journal-chat':
        systemPrompt = `You are a supportive journaling companion who understands the user's patterns, moods, and progress. Help reflect on experiences with empathy and insight.
${contextString}`;
        break;
      case 'journal-recap':
        systemPrompt = `You are a thoughtful journaling assistant. Based on the user's activity today, generate a reflective journal entry draft they can edit. Be warm, personal, and highlight key moments.
${contextString}`;
        userPrompt = `Generate a journal entry recap for today based on this activity feed: ${JSON.stringify(context?.activityFeed || [])}. Include reflections on tasks completed, habits done, money spent, and any focus sessions.`;
        break;
      case 'auto-categorize':
        systemPrompt = 'You are a transaction categorizer. Return only the category name.';
        userPrompt = `Categorize "${context?.description}" into: ${context?.categories?.join(', ')}`;
        break;
      case 'generate-schedule':
        systemPrompt = 'You are a productivity expert. Generate a daily schedule.';
        userPrompt = `Generate 4-5 tasks for: "${context?.prompt}". Return as JSON array with text property.`;
        break;
      case 'generate-habits':
        systemPrompt = 'You are a habit formation expert. Generate specific, actionable habits.';
        userPrompt = `Generate habits for goal: "${context?.goal}" because: "${context?.why}". Return as JSON array with name property.`;
        break;
      case 'weekly-report':
        systemPrompt = 'You are a personal development coach. Analyze entries and provide insights.';
        userPrompt = `Analyze journal entries: ${JSON.stringify(context?.entries)}`;
        break;
      default:
        systemPrompt = 'You are a helpful AI assistant.';
    }

    // Build messages for Gemini API
    const apiMessages = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I will help you.' }] },
    ];

    if (messages && messages.length > 0) {
      for (const msg of messages) {
        apiMessages.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    if (userPrompt) {
      apiMessages.push({ role: 'user', parts: [{ text: userPrompt }] });
    }

    console.log('Calling Gemini API with type:', type, 'has context:', !!userContext);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: apiMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 400 && errorText.includes('API_KEY_INVALID')) {
        return new Response(
          JSON.stringify({ error: 'Invalid Gemini API key. Please check your API key in Settings.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Gemini API error. Please check your API key.' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('Gemini response received for type:', type);

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
