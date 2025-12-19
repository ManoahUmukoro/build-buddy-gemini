import { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowRight, Loader2, X, GripVertical } from 'lucide-react';
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
  const [isHidden, setIsHidden] = useState(() => {
    const stored = localStorage.getItem('ai_button_hidden');
    return stored === 'true';
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(() => {
    const stored = localStorage.getItem('ai_button_position');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { x: null, y: null };
      }
    }
    return { x: null, y: null };
  });
  const [isDragging, setIsDragging] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const ai = useAI();

  useEffect(() => {
    localStorage.setItem('ai_button_hidden', String(isHidden));
  }, [isHidden]);

  useEffect(() => {
    if (position.x !== null && position.y !== null) {
      localStorage.setItem('ai_button_position', JSON.stringify(position));
    }
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!buttonRef.current) return;
    setIsDragging(true);
    const rect = buttonRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 60;
      
      setPosition({
        x: Math.max(10, Math.min(newX, maxX)),
        y: Math.max(10, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    const command = input.toLowerCase();
    
    try {
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

  const buttonStyle = position.x !== null && position.y !== null
    ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
    : {};

  if (isHidden) {
    return (
      <button
        onClick={() => setIsHidden(false)}
        className="fixed bottom-20 md:bottom-10 right-6 md:right-10 bg-muted text-muted-foreground p-2 rounded-full shadow-lg hover:bg-accent transition-all z-50 opacity-50 hover:opacity-100"
        title="Show AI Command Center"
      >
        <Sparkles size={16} />
      </button>
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => !isDragging && setIsOpen(true)}
        onMouseDown={handleMouseDown}
        style={buttonStyle}
        className={`fixed ${position.x === null ? 'bottom-20 md:bottom-10 right-6 md:right-10' : ''} bg-gradient-to-r from-primary to-accent text-primary-foreground p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all z-50 group ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab'}`}
        title="Ask LifeOS (drag to move)"
      >
        <Sparkles size={28} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsHidden(true);
          }}
          className="absolute -top-1 -right-1 bg-card text-muted-foreground p-1 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
          title="Hide AI button"
        >
          <X size={12} />
        </button>
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
