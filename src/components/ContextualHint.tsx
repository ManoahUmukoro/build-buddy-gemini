import { useState, ReactNode } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { useHintDismissals } from '@/hooks/useHintDismissals';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ContextualHintProps {
  hintId: string;
  title: string;
  description: string;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  showIcon?: boolean;
  className?: string;
}

export function ContextualHint({
  hintId,
  title,
  description,
  children,
  side = 'top',
  showIcon = true,
  className,
}: ContextualHintProps) {
  const { isDismissed, dismiss, loading } = useHintDismissals();
  const [isOpen, setIsOpen] = useState(false);

  // Don't show if already dismissed or still loading
  if (loading || isDismissed(hintId)) {
    return <>{children}</>;
  }

  const handleDismiss = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await dismiss(hintId);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative inline-flex items-center gap-1", className)}>
      {children}
      
      {showIcon && (
        <Tooltip open={isOpen} onOpenChange={setIsOpen}>
          <TooltipTrigger asChild>
            <button
              className="p-0.5 text-muted-foreground hover:text-primary transition-colors animate-pulse"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(true);
              }}
            >
              <HelpCircle size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent 
            side={side} 
            className="max-w-[280px] p-0 bg-card border border-border shadow-xl"
            sideOffset={8}
          >
            <div className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-sm text-foreground">{title}</h4>
                <button
                  onClick={handleDismiss}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleDismiss}
                className="w-full text-xs h-7"
              >
                Got it!
              </Button>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// Pre-defined hints for key features
export const HINTS = {
  safeDailySpend: {
    id: 'safe_daily_spend',
    title: 'Safe Daily Spend',
    description: 'Calculated as: (Monthly Income - Expenses - Fixed Costs - Savings Goals) ÷ Days Remaining in Month. This tells you how much you can safely spend each day.',
  },
  importStatement: {
    id: 'import_statement',
    title: 'Import Bank Statement',
    description: 'Upload PDF, CSV, or Excel bank statements. Supported banks: OPay, Kuda, and most Nigerian banks. Duplicate transactions are automatically detected.',
  },
  habitStreak: {
    id: 'habit_streak',
    title: 'Habit Streak',
    description: 'Your streak shows completed habits across the current week. Complete all daily habits to maintain your streak!',
  },
  accountBalance: {
    id: 'account_balance',
    title: 'Account Balance',
    description: 'Click on an account card to filter all transactions to just that account. Select "All Accounts" to see combined totals.',
  },
  aiFeatures: {
    id: 'ai_features',
    title: 'AI Features',
    description: 'AI-powered features like Smart Sort, Task Breakdown, and Finance Chat require a Pro subscription. Upgrade to unlock!',
  },
};
