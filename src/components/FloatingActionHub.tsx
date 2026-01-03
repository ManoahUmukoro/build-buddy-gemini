import { useState, useRef, useEffect } from 'react';
import {
  Menu, X, Timer, Sparkles, MessageCircle, Loader2, ArrowRight
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { FloatingFocusTimer } from '@/components/FloatingFocusTimer';
import { LiveSupportChat } from '@/components/LiveSupportChat';
import { useAI } from '@/hooks/useAI';
import { DAYS } from '@/lib/constants';
import { toast } from 'sonner';

interface Task {
  id: string | number;
  text: string;
  done: boolean;
}

interface FloatingActionHubProps {
  todayTasks?: Task[];
  onAddTask: (day: string, task: { id: number; text: string; done: boolean }) => void;
  onAddTransaction: (transaction: { id: number; type: 'income' | 'expense'; amount: number; category: string; description: string; date: string }) => void;
  onAddSavingsGoal: (goal: { id: number; name: string; target: number; current: number }) => void;
  onSessionComplete?: (duration: number, taskLabel?: string) => void;
}

export function FloatingActionHub({ 
  todayTasks, 
  onAddTask, 
  onAddTransaction, 
  onAddSavingsGoal,
  onSessionComplete 
}: FloatingActionHubProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'menu' | 'focus' | 'ai' | 'support' | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiInput, setAIInput] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [isSupportChatOpen, setIsSupportChatOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const ai = useAI();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        if (activePanel === 'menu') {
          setIsOpen(false);
          setActivePanel(null);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, activePanel]);

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      setActivePanel(null);
    } else {
      setIsOpen(true);
      setActivePanel('menu');
    }
  };

  const handleSelectFocus = () => {
    setActivePanel('focus');
    setIsOpen(false);
  };

  const handleSelectAI = () => {
    setActivePanel(null);
    setIsOpen(false);
    setIsAIModalOpen(true);
  };

  const handleSelectSupport = () => {
    setActivePanel(null);
    setIsOpen(false);
    setIsSupportChatOpen(true);
  };

  const handleAICommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || isAILoading) return;

    setIsAILoading(true);
    const command = aiInput.toLowerCase();
    
    try {
      if (command.includes('add task') || command.includes('add a task')) {
        const taskText = aiInput.replace(/add\s*(a\s*)?task\s*(to\s*)?(buy|call|do|get|send|write)?/i, '').trim();
        if (taskText) {
          const today = new Date().getDay();
          const dayIndex = today === 0 ? 6 : today - 1;
          const day = DAYS[dayIndex];
          onAddTask(day, { id: Date.now(), text: taskText, done: false });
          toast.success(`Task added: "${taskText}"`);
          setAIInput('');
          setIsAIModalOpen(false);
        }
      } else if (command.includes('spent') || command.includes('expense') || command.match(/\$\d+|\d+\s*(naira|₦)/)) {
        const amountMatch = aiInput.match(/\$?(\d+(?:\.\d{2})?)\s*/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
        const description = aiInput.replace(/spent|expense|\$?\d+(?:\.\d{2})?\s*(on|for)?/gi, '').trim() || 'Quick Expense';
        
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
          setAIInput('');
          setIsAIModalOpen(false);
        }
      } else if (command.includes('save') || command.includes('savings goal')) {
        const amountMatch = aiInput.match(/\$?(\d+(?:\.\d{2})?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
        const nameMatch = aiInput.match(/for\s+(.+)/i);
        const name = nameMatch ? nameMatch[1].trim() : 'New Goal';
        
        if (amount > 0) {
          onAddSavingsGoal({
            id: Date.now(),
            name,
            target: amount,
            current: 0
          });
          toast.success(`Savings goal created: ${name}`);
          setAIInput('');
          setIsAIModalOpen(false);
        }
      } else {
        toast.info("I didn't understand that. Try 'Add task to buy milk' or 'Spent $20 on lunch'");
      }
    } catch (error) {
      toast.error("Couldn't process that command");
    } finally {
      setIsAILoading(false);
    }
  };

  const suggestions = [
    "Add task to call Mom",
    "Spent $20 on Lunch",
    "Save $500 for Trip",
  ];

  // If focus timer is active, render it
  if (activePanel === 'focus') {
    return (
      <FloatingFocusTimer 
        todayTasks={todayTasks} 
        onSessionComplete={onSessionComplete}
        onClose={() => setActivePanel(null)}
      />
    );
  }

  return (
    <>
      {/* Main Floating Button */}
      <div ref={menuRef} className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50">
        {/* Menu Panel */}
        {isOpen && activePanel === 'menu' && (
          <div className="absolute bottom-14 right-0 bg-card border border-border rounded-xl shadow-lg p-1.5 min-w-[160px] animate-in">
            <button
              onClick={handleSelectFocus}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <div className="p-1.5 bg-primary/10 rounded-md">
                <Timer size={14} className="text-primary" />
              </div>
              <div>
                <span className="font-medium text-xs text-card-foreground">Focus Timer</span>
                <p className="text-[10px] text-muted-foreground leading-tight">Start session</p>
              </div>
            </button>
            
            <button
              onClick={handleSelectAI}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <div className="p-1.5 bg-primary/10 rounded-md">
                <Sparkles size={14} className="text-primary" />
              </div>
              <div>
                <span className="font-medium text-xs text-card-foreground">AI Command</span>
                <p className="text-[10px] text-muted-foreground leading-tight">Quick actions</p>
              </div>
            </button>
            
            <button
              onClick={handleSelectSupport}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <div className="p-1.5 bg-primary/10 rounded-md">
                <MessageCircle size={14} className="text-primary" />
              </div>
              <div>
                <span className="font-medium text-xs text-card-foreground">Support</span>
                <p className="text-[10px] text-muted-foreground leading-tight">Get help</p>
              </div>
            </button>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={handleToggle}
          data-tutorial="floating-hub"
          className={`p-3 rounded-full shadow-lg transition-all duration-300 ${
            isOpen 
              ? 'bg-muted text-muted-foreground rotate-45' 
              : 'bg-gradient-to-r from-primary to-accent text-primary-foreground hover:scale-105'
          }`}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* AI Command Modal */}
      <Modal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} title="AI Command Center" maxWidth="max-w-xl">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Ask LifeOS to do anything for you. Try "Add a task to buy milk", "Log $50 for gas", or "Set a savings goal".
          </p>
          <form onSubmit={handleAICommand} className="relative">
            <input
              autoFocus
              className="w-full p-4 pl-12 bg-muted border-2 border-primary/20 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-lg text-card-foreground placeholder:text-muted-foreground transition-all"
              placeholder="What's on your mind?"
              value={aiInput}
              onChange={(e) => setAIInput(e.target.value)}
              disabled={isAILoading}
            />
            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60" size={20} />
            <button
              type="submit"
              disabled={isAILoading || !aiInput.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-2 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {isAILoading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
            </button>
          </form>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => setAIInput(s)}
                className="text-xs bg-muted hover:bg-accent text-muted-foreground px-3 py-1.5 rounded-full transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Live Support Chat */}
      <LiveSupportChat
        isOpen={isSupportChatOpen}
        onClose={() => setIsSupportChatOpen(false)}
      />
    </>
  );
}
