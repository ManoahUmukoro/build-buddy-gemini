import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Info, Calendar, Target, DollarSign, Book, Settings, Sparkles } from 'lucide-react';

interface FaqItemProps {
  question: string;
  answer: React.ReactNode;
}

function FaqItem({ question, answer }: FaqItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex justify-between items-center py-4 text-left font-medium text-card-foreground hover:text-primary transition-colors"
      >
        {question}
        {isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
      </button>
      {isOpen && (
        <div className="pb-4 text-sm text-muted-foreground leading-relaxed animate-in slide-in-from-top-1">
          {answer}
        </div>
      )}
    </div>
  );
}

export function HelpTab() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">
      <div className="bg-primary text-primary-foreground p-8 rounded-2xl shadow-lg mb-8">
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <HelpCircle size={32}/> LifeOS Help Center
        </h2>
        <p className="text-primary-foreground/80">Your complete guide to mastering LifeOS - your personal command center for productivity, finance, and growth.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* INTRO */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-soft">
          <h3 className="font-bold text-lg text-card-foreground mb-3 flex items-center gap-2">
            <Info size={20} className="text-primary"/> What is LifeOS?
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            LifeOS is your all-in-one personal command center designed to bring order to your daily life. 
            It seamlessly combines task planning, financial tracking, habit building, and reflective journaling 
            into a single, cohesive experience. Your data is securely stored in the cloud and synchronized 
            across all your devices. With AI-powered features, LifeOS helps you work smarter, not harder.
          </p>
        </div>

        {/* FEATURES */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-soft">
          <h3 className="font-bold text-lg text-card-foreground mb-4">Feature Guides</h3>
          <div className="space-y-4">
            <FaqItem 
              question="📅 The Planner (Dashboard)"
              answer={
                <div className="space-y-3">
                  <p>Your weekly command center for managing tasks and staying organized.</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li><strong>Weekly View:</strong> See all 7 days at a glance with dedicated task lists for each day.</li>
                    <li><strong>Brain Dump:</strong> Capture quick ideas in the Brain Dump section before scheduling them.</li>
                    <li><strong>Smart Sort:</strong> Click the sort icon to let AI automatically prioritize your tasks by importance and urgency.</li>
                    <li><strong>Task Breakdown:</strong> Click the breakdown icon on any task to split it into smaller, actionable subtasks.</li>
                    <li><strong>Focus Timer:</strong> Use the Pomodoro timer to stay focused on tasks in 25-minute intervals.</li>
                    <li><strong>Task Reminders:</strong> Add times to tasks and receive browser notifications when they're due.</li>
                  </ul>
                </div>
              }
            />
            <FaqItem 
              question="💰 Finance Tracker"
              answer={
                <div className="space-y-3">
                  <p>Complete financial management with multiple sub-tabs for different needs.</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li><strong>Overview Tab:</strong> Track income and expenses, see your balance and safe daily spend amount.</li>
                    <li><strong>Currency Toggle:</strong> Switch between Naira (₦) and Dollar ($) display using the refresh icon on the balance card.</li>
                    <li><strong>Receipt Scanner:</strong> Upload receipt photos and AI will extract transaction details automatically.</li>
                    <li><strong>Auto-Categorize:</strong> Click the wand icon to let AI categorize your expenses based on description.</li>
                    <li><strong>Budgets Tab:</strong> Set monthly limits for each category. Use "Auto-Allocate" for 50/30/20 rule budgeting.</li>
                    <li><strong>Savings Tab:</strong> Create savings goals, track progress, and manage deposits/withdrawals.</li>
                    <li><strong>Finance Chat:</strong> Ask the AI finance expert questions about your spending patterns.</li>
                  </ul>
                </div>
              }
            />
            <FaqItem 
              question="🎯 Systems & Goals"
              answer={
                <div className="space-y-3">
                  <p>Build lasting change through habit-based systems instead of just setting goals.</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li><strong>Create Systems:</strong> Define a goal (e.g., "Get Fit") and your "Why" for motivation.</li>
                    <li><strong>Add Habits:</strong> Break down goals into daily habits (e.g., "Drink 8 glasses of water", "Walk 10k steps").</li>
                    <li><strong>AI Habit Generator:</strong> Let AI suggest habits based on your goal automatically.</li>
                    <li><strong>Daily Tracking:</strong> Check off habits each day to build streaks and consistency.</li>
                    <li><strong>Visual Progress:</strong> See your completion rate and streak count for motivation.</li>
                  </ul>
                </div>
              }
            />
            <FaqItem 
              question="📖 Journal"
              answer={
                <div className="space-y-3">
                  <p>Reflect on your days and track your emotional well-being over time.</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li><strong>Daily Entries:</strong> Log your mood (1-5 scale), today's win, area to improve, and free-form thoughts.</li>
                    <li><strong>Mood Tracking:</strong> Visualize your mood patterns over time with emoji indicators.</li>
                    <li><strong>Chat with Buddy:</strong> Talk to an AI companion who listens and offers thoughtful advice.</li>
                    <li><strong>Weekly Report:</strong> Generate AI-powered insights from your recent journal entries.</li>
                    <li><strong>Entry History:</strong> Review and edit past entries to track your growth journey.</li>
                  </ul>
                </div>
              }
            />
            <FaqItem 
              question="⚙️ Data Vault (Settings)"
              answer={
                <div className="space-y-3">
                  <p>Manage your data and configure your LifeOS experience.</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li><strong>Backup Data:</strong> Export all your data as a JSON file for safekeeping.</li>
                    <li><strong>Restore Data:</strong> Import a previous backup to restore your data.</li>
                    <li><strong>API Configuration:</strong> Optionally configure your own Gemini API key for AI features.</li>
                  </ul>
                </div>
              }
            />
            <FaqItem 
              question="✨ AI Features"
              answer={
                <div className="space-y-3">
                  <p>LifeOS is powered by AI to help you be more productive.</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li><strong>Smart Sort:</strong> Prioritizes tasks based on importance and time sensitivity.</li>
                    <li><strong>Task Breakdown:</strong> Splits large tasks into manageable subtasks.</li>
                    <li><strong>Smart Draft:</strong> Generates email or message drafts for task-related communication.</li>
                    <li><strong>Life Audit:</strong> Provides a comprehensive review of your habits, finances, and productivity.</li>
                    <li><strong>Receipt Scanning:</strong> Extracts transaction data from receipt photos automatically.</li>
                    <li><strong>Auto-Categorize:</strong> Suggests expense categories based on transaction descriptions.</li>
                    <li><strong>Finance Analysis:</strong> Analyzes your spending patterns and provides insights.</li>
                    <li><strong>Habit Generator:</strong> Suggests habits based on your goals and motivations.</li>
                    <li><strong>AI Command Button:</strong> Quick-add tasks, transactions, or savings goals via natural language.</li>
                  </ul>
                </div>
              }
            />
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-soft">
          <h3 className="font-bold text-lg text-card-foreground mb-4">Frequently Asked Questions</h3>
          <div className="space-y-2">
            <FaqItem 
              question="Is my data safe?" 
              answer="Yes. LifeOS stores all your data securely in the cloud with full authentication protection. Only you can access your data. Use the 'Backup' feature in Data Vault regularly for extra peace of mind." 
            />
            <FaqItem 
              question="How does the Currency Converter work?" 
              answer="The Finance tab allows you to toggle between Naira (₦) and Dollar ($) display. Click the refresh icon on the Balance card to switch. The system uses a reference exchange rate of approximately ₦1,600 to $1 to convert your displayed values so you can see your finances in both currencies." 
            />
            <FaqItem 
              question="How do task reminders work?" 
              answer="When adding or editing a task, you can set a specific time. LifeOS will send you a browser notification 5 minutes before the scheduled time (or at the exact time). Make sure to allow browser notifications when prompted. If email notifications are configured, you'll also receive email reminders." 
            />
            <FaqItem 
              question="What is the 50/30/20 budgeting rule?" 
              answer="The 50/30/20 rule is a simple budgeting guideline: 50% of income goes to needs (rent, bills, food), 30% to wants (entertainment, shopping), and 20% to savings and financial goals. Use the 'Auto-Allocate' button in the Budgets tab to apply this automatically based on your income." 
            />
            <FaqItem 
              question="How does the receipt scanner work?" 
              answer="Click 'Scan Receipt' in the transaction form and upload a photo of your receipt. Our AI will analyze the image and extract the amount, vendor name, and suggest a category. Review the extracted data and save the transaction. Works best with clear, well-lit photos." 
            />
            <FaqItem 
              question="Can I use this offline?" 
              answer="LifeOS requires an internet connection as data is stored in the cloud for synchronization across devices. AI features like receipt scanning, smart sort, and chat also require connectivity." 
            />
            <FaqItem 
              question="How do I create effective systems?" 
              answer="Start with a clear goal, then add your 'Why' - the motivation behind it. Break the goal into small, daily habits that are easy to complete consistently. Focus on building 2-3 habits at a time rather than many at once. Use the AI habit generator for suggestions based on your goal." 
            />
          </div>
        </div>
        
        {/* Tips */}
        <div className="bg-primary/10 p-6 rounded-xl border border-primary/20">
          <h3 className="font-bold text-lg text-primary mb-3 flex items-center gap-2">
            <Sparkles size={20}/> Pro Tips
          </h3>
          <ul className="space-y-2 text-sm text-card-foreground">
            <li>• <strong>Daily Review:</strong> Spend 5 minutes each morning reviewing your tasks and habits.</li>
            <li>• <strong>Weekly Journal:</strong> Use the weekly report feature to reflect on patterns and progress.</li>
            <li>• <strong>Budget First:</strong> Set up your budgets at the start of each month for better control.</li>
            <li>• <strong>Small Habits:</strong> Start with tiny habits that take 2 minutes or less to build momentum.</li>
            <li>• <strong>Use Brain Dump:</strong> Capture ideas quickly without overthinking where they belong.</li>
            <li>• <strong>Check Safe Daily Spend:</strong> Glance at this number before making purchases to stay on budget.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
