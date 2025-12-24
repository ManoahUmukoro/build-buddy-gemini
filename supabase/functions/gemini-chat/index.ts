import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    
    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI Gateway - no user API keys needed
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let systemPrompt = '';
    let userPrompt = '';

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
        systemPrompt = 'You are a life coach. Provide actionable insights and recommendations.';
        userPrompt = `Analyze: Habits ${context?.completedHabits}/${context?.totalHabits}, Balance: ${context?.balance}, Tasks: ${context?.totalTasks}, Journal: ${context?.journalCount}`;
        break;
      case 'daily-briefing':
        systemPrompt = 'You are a personal assistant. Provide a motivating daily briefing.';
        userPrompt = `Daily briefing: ${context?.todayTasks} tasks, ${context?.habitsToComplete} habits left, balance: ${context?.balance}`;
        break;
      case 'finance-analysis':
        systemPrompt = 'You are a financial advisor. Analyze spending and provide insights.';
        userPrompt = `Analyze: Income ${context?.totalIncome}, Expenses ${context?.totalExpense}, Balance ${context?.balance}, Categories: ${JSON.stringify(context?.expenseData)}`;
        break;
      case 'finance-chat':
        systemPrompt = 'You are a friendly financial advisor. Answer personal finance questions.';
        break;
      case 'journal-chat':
        systemPrompt = 'You are a supportive journaling companion. Help reflect on experiences.';
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

    // Build messages for Lovable AI (OpenAI-compatible format)
    const apiMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    if (messages && messages.length > 0) {
      for (const msg of messages) {
        apiMessages.push({
          role: msg.role === 'model' ? 'assistant' : msg.role,
          content: msg.content
        });
      }
    }

    if (userPrompt) {
      apiMessages.push({ role: 'user', content: userPrompt });
    }

    console.log('Calling Lovable AI with type:', type);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service error. Please try again.' }),
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
