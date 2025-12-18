import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';

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
        <p className="text-primary-foreground/80">Your guide to mastering productivity and finance with LifeOS.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* INTRO */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-soft">
          <h3 className="font-bold text-lg text-card-foreground mb-3 flex items-center gap-2">
            <Info size={20} className="text-primary"/> What is LifeOS?
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            LifeOS is a privacy-first, all-in-one personal dashboard designed to bring order to your daily chaos. 
            It combines task management, financial tracking, habit building, and journaling into a single, cohesive experience. 
            Your data is securely stored in the cloud and synchronized across your devices.
          </p>
        </div>

        {/* FEATURES */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-soft">
          <h3 className="font-bold text-lg text-card-foreground mb-4">Feature Guides</h3>
          <div className="space-y-4">
            <FaqItem 
              question="📅 The Planner"
              answer={
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li><strong>Daily Tasks:</strong> Add tasks to specific days to create a schedule.</li>
                  <li><strong>Brain Dump:</strong> Use the Brain Dump box for ideas you aren't ready to schedule yet.</li>
                  <li><strong>Smart Sort:</strong> Click the sort icon to automatically organize tasks by priority or time.</li>
                  <li><strong>Focus Mode:</strong> Click the timer icon on any task to start a Pomodoro session.</li>
                </ul>
              }
            />
            <FaqItem 
              question="💰 Finance Tracker"
              answer={
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li><strong>Transactions:</strong> Log income and expenses. Use the toggle to switch between NGN and USD views.</li>
                  <li><strong>Quick Check:</strong> Get an instant breakdown of your spending habits and biggest expenses.</li>
                  <li><strong>Budgets:</strong> Set monthly limits for categories like Food or Transport.</li>
                  <li><strong>Savings:</strong> Create goals (e.g., "New Laptop") and track your contributions visually.</li>
                </ul>
              }
            />
            <FaqItem 
              question="🎯 Systems & Goals"
              answer="Instead of just setting a big goal like 'Get Fit', LifeOS encourages you to build 'Systems'—daily habits. Create a System, then add habits (e.g., 'Drink Water', 'Run 5k') to track your daily consistency."
            />
            <FaqItem 
              question="📖 Journal & AI Buddy"
              answer="Log your daily mood and thoughts. Need to vent? Open the 'Chat with Buddy' modal to talk to an AI companion who listens and offers advice."
            />
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-soft">
          <h3 className="font-bold text-lg text-card-foreground mb-4">Frequently Asked Questions</h3>
          <div className="space-y-2">
            <FaqItem 
              question="Is my data safe?" 
              answer="Yes. LifeOS stores all your data securely in the cloud with authentication. Use the 'Backup' feature in Settings regularly for extra safety." 
            />
            <FaqItem 
              question="How does the Currency Converter work?" 
              answer="The Finance tab allows you to toggle between Naira (₦) and Dollar ($). The system uses a fixed reference rate to instantly convert your displayed values so you can see your worth in both currencies." 
            />
            <FaqItem 
              question="Can I use this offline?" 
              answer="The core features require an internet connection since data is stored in the cloud. AI features like the Meal Chef or Chat also require connectivity." 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
