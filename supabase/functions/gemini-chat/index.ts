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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'smart-sort':
        systemPrompt = 'You are a productivity expert. Analyze the given tasks and return them sorted by priority and urgency. Consider deadlines, importance, and dependencies. Return only the sorted task list as JSON array with id and text fields.';
        userPrompt = `Sort these tasks by priority: ${JSON.stringify(context.tasks)}`;
        break;
      
      case 'task-breakdown':
        systemPrompt = 'You are a productivity expert. Break down the given task into 3-5 actionable subtasks. Return as JSON array with text field for each subtask.';
        userPrompt = `Break down this task into actionable steps: "${context.taskText}"`;
        break;
      
      case 'smart-draft':
        systemPrompt = 'You are a professional writing assistant. Generate a well-written draft based on the task description. Be concise and professional.';
        userPrompt = `Write a draft email/message for this task: "${context.taskText}"`;
        break;
      
      case 'life-audit':
        systemPrompt = 'You are a life coach and productivity consultant. Analyze the user\'s data and provide actionable insights and recommendations.';
        userPrompt = `Analyze this data and provide a life audit:
          - Habit completion: ${context.completedHabits}/${context.totalHabits} today
          - Financial balance: ${context.balance}
          - Total tasks: ${context.totalTasks}
          - Journal entries: ${context.journalCount}
          Provide specific, actionable insights.`;
        break;
      
      case 'daily-briefing':
        systemPrompt = 'You are a personal assistant. Provide a motivating daily briefing based on the user\'s data.';
        userPrompt = `Generate a daily briefing:
          - Tasks today: ${context.todayTasks}
          - Habits to complete: ${context.habitsToComplete}
          - Financial status: ${context.balance}
          Make it motivating and actionable.`;
        break;
      
      case 'finance-analysis':
        systemPrompt = 'You are a financial advisor. Analyze spending patterns and provide insights.';
        userPrompt = `Analyze these finances:
          - Total Income: ${context.totalIncome}
          - Total Expenses: ${context.totalExpense}
          - Balance: ${context.balance}
          - Categories: ${JSON.stringify(context.expenseData)}
          Provide specific recommendations.`;
        break;
      
      case 'finance-chat':
        systemPrompt = 'You are a friendly financial advisor. Answer questions about personal finance and provide advice based on the user\'s financial data.';
        break;
      
      case 'journal-chat':
        systemPrompt = 'You are a supportive and empathetic journaling companion. Help users reflect on their experiences, process emotions, and gain insights. Be warm and encouraging.';
        break;
      
      case 'auto-categorize':
        systemPrompt = 'You are a transaction categorizer. Given a transaction description and available categories, return only the most appropriate category name.';
        userPrompt = `Categorize this transaction: "${context.description}"
          Available categories: ${context.categories.join(', ')}
          Return only the category name.`;
        break;
      
      case 'receipt-scan':
        systemPrompt = 'You are a receipt parser. Extract the total amount and description from the receipt image. Return as JSON with amount (number) and description (string) fields.';
        userPrompt = 'Parse this receipt image and extract the total amount and a brief description.';
        break;
      
      case 'generate-schedule':
        systemPrompt = 'You are a productivity expert. Generate a daily schedule based on the user\'s goals and preferences.';
        userPrompt = `Generate 4-5 tasks for a productive day based on: "${context.prompt}"`;
        break;
      
      case 'generate-habits':
        systemPrompt = 'You are a habit formation expert. Generate 3-4 specific, actionable habits to help achieve a goal.';
        userPrompt = `Generate habits to achieve this goal: "${context.goal}" with this motivation: "${context.why}"`;
        break;
      
      case 'weekly-report':
        systemPrompt = 'You are a personal development coach. Analyze journal entries and provide a weekly summary with insights.';
        userPrompt = `Analyze these journal entries from the past week: ${JSON.stringify(context.entries)}
          Provide a summary of mood trends, wins, areas for improvement, and actionable recommendations.`;
        break;
      
      default:
        systemPrompt = 'You are a helpful AI assistant.';
    }

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...(messages || []),
      ...(userPrompt ? [{ role: 'user', content: userPrompt }] : [])
    ];

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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log('AI response received for type:', type);

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gemini-chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
