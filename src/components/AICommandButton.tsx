import { useState } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useAI } from '@/hooks/useAI';
import { toast } from 'sonner';

interface AICommandButtonProps {
  onAddTask: (day: string, task: { id: number; text: string; done: boolean }) => void;
  onAddTransaction: (transaction: { id: number; type: 'income' | 'expense'; amount: number; category: string; description: string; date: string }) => void;
  onAddSavingsGoal: (goal: { id: number; name: string; target: number; current: number }) => void;
}

export function AICommandButton({ onAddTask, onAddTransaction, onAddSavingsGoal }: AICommandButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const ai = useAI();

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    const command = input.toLowerCase();
    
    try {
      // Parse the command locally first for common patterns
      if (command.includes('add task') || command.includes('add a task')) {
        const taskText = input.replace(/add\s*(a\s*)?task\s*(to\s*)?(buy|call|do|get|send|write)?/i, '').trim();
        if (taskText) {
          const today = new Date().getDay();
          const dayIndex = today === 0 ? 6 : today - 1;
          const day = `d${dayIndex}`;
          onAddTask(day, { id: Date.now(), text: taskText, done: false });
          toast.success(`Task added: "${taskText}"`);
          setInput('');
          setIsOpen(false);
        }
      } else if (command.includes('spent') || command.includes('expense') || command.match(/\$\d+|\d+\s*(naira|₦)/)) {
        const amountMatch = input.match(/\$?(\d+(?:\.\d{2})?)\s*/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
        const description = input.replace(/spent|expense|\$?\d+(?:\.\d{2})?\s*(on|for)?/gi, '').trim() || 'Quick Expense';
        
        if (amount > 0) {
          onAddTransaction({
            id: Date.now(),
            type: 'expense',
            amount,
            category: 'Other',
            description,
            date: new Date().toISOString().split('T')[0]
          });
          toast.success(`Expense logged: ${description} ($${amount})`);
          setInput('');
          setIsOpen(false);
        }
      } else if (command.includes('save') || command.includes('savings goal')) {
        const amountMatch = input.match(/\$?(\d+(?:\.\d{2})?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
        const nameMatch = input.match(/for\s+(.+)/i);
        const name = nameMatch ? nameMatch[1].trim() : 'New Goal';
        
        if (amount > 0) {
          onAddSavingsGoal({
            id: Date.now(),
            name,
            target: amount,
            current: 0
          });
          toast.success(`Savings goal created: ${name}`);
          setInput('');
          setIsOpen(false);
        }
      } else {
        toast.info("I didn't understand that. Try 'Add task to buy milk' or 'Spent $20 on lunch'");
      }
    } catch (error) {
      toast.error("Couldn't process that command");
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "Add task to call Mom",
    "Spent $20 on Lunch",
    "Save $500 for Trip",
    "New Goal: Read Books"
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-10 right-6 md:right-10 bg-gradient-to-r from-primary to-accent text-primary-foreground p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all z-50"
        title="Ask LifeOS"
      >
        <Sparkles size={28} />
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="AI Command Center" maxWidth="max-w-xl">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Ask LifeOS to do anything for you. Try "Add a task to buy milk", "Log $50 for gas", or "Set a savings goal".
          </p>
          <form onSubmit={handleCommand} className="relative">
            <input
              autoFocus
              className="w-full p-4 pl-12 bg-muted border-2 border-primary/20 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-lg text-card-foreground placeholder:text-muted-foreground transition-all"
              placeholder="What's on your mind?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60" size={20} />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-2 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
            </button>
          </form>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="text-xs bg-muted hover:bg-accent text-muted-foreground px-3 py-1.5 rounded-full transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
