import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PiggyBank, Target, Calendar, Plus, Minus, Loader2 } from 'lucide-react';
import { SavingsGoal } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { useSavingsEntries } from '@/hooks/useSavingsEntries';
import { toast } from 'sonner';

interface SavingsGoalModalProps {
  mode: 'add' | 'deposit';
  goal?: SavingsGoal;
  currency: string;
  onSave: (goal: Partial<SavingsGoal>) => void;
  onUpdateBalance: (goalId: string | number, newBalance: number) => void;
  onClose: () => void;
}

export function SavingsGoalModal({ 
  mode, 
  goal, 
  currency, 
  onSave, 
  onUpdateBalance,
  onClose 
}: SavingsGoalModalProps) {
  // Add Goal State
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  
  // Deposit/Withdraw State
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [operation, setOperation] = useState<'deposit' | 'withdrawal'>('deposit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { addEntry } = useSavingsEntries(goal?.id ? String(goal.id) : undefined);

  const handleAddGoal = () => {
    if (!goalName.trim() || !targetAmount) {
      toast.error('Please enter goal name and target amount');
      return;
    }
    
    onSave({
      name: goalName.trim(),
      target: parseFloat(targetAmount),
      current: 0,
      targetDate: targetDate || undefined,
    });
    onClose();
  };

  const handleDeposit = async () => {
    if (!goal || !amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setIsSubmitting(true);
    const numAmount = parseFloat(amount);
    const currentBalance = goal.current || 0;
    
    // Calculate new balance
    const newBalance = operation === 'deposit'
      ? currentBalance + numAmount 
      : Math.max(0, currentBalance - numAmount);
    
    // Add entry to savings_entries table
    await addEntry({
      savings_goal_id: String(goal.id),
      type: operation,
      amount: numAmount,
      note: note || null,
      date: new Date().toISOString().split('T')[0],
    });
    
    // Update the goal balance
    onUpdateBalance(goal.id, newBalance);
    
    toast.success(operation === 'deposit' 
      ? `${formatCurrency(numAmount, currency)} deposited!` 
      : `${formatCurrency(numAmount, currency)} withdrawn!`
    );
    
    setIsSubmitting(false);
    onClose();
  };

  if (mode === 'add') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <PiggyBank className="text-primary" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg">New Savings Goal</h3>
            <p className="text-sm text-muted-foreground">What are you saving for?</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal-name" className="flex items-center gap-2">
            <Target size={14} />
            Goal Name
          </Label>
          <Input
            id="goal-name"
            placeholder="e.g., New Car, Vacation, Emergency Fund"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target-amount">Target Amount ({currency})</Label>
          <Input
            id="target-amount"
            type="number"
            placeholder="0.00"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            min="0"
            step="100"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target-date" className="flex items-center gap-2">
            <Calendar size={14} />
            Target Date (Optional)
          </Label>
          <Input
            id="target-date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleAddGoal} className="flex-1" disabled={!goalName.trim() || !targetAmount}>
            Create Goal
          </Button>
        </div>
      </div>
    );
  }

  // Deposit/Withdraw mode
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <PiggyBank className="text-primary" size={24} />
        </div>
        <div>
          <h3 className="font-bold text-lg">{goal?.name}</h3>
          <p className="text-sm text-muted-foreground">
            Current: {formatCurrency(goal?.current || 0, currency)} / {formatCurrency(goal?.target || 0, currency)}
          </p>
        </div>
      </div>

      {/* Operation Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOperation('deposit')}
          className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 font-medium transition-all ${
            operation === 'deposit' 
              ? 'border-success bg-success/10 text-success' 
              : 'border-border bg-muted text-muted-foreground hover:border-success/50'
          }`}
        >
          <Plus size={18} />
          Deposit
        </button>
        <button
          type="button"
          onClick={() => setOperation('withdrawal')}
          className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 font-medium transition-all ${
            operation === 'withdrawal' 
              ? 'border-destructive bg-destructive/10 text-destructive' 
              : 'border-border bg-muted text-muted-foreground hover:border-destructive/50'
          }`}
        >
          <Minus size={18} />
          Withdraw
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount ({currency})</Label>
        <Input
          id="amount"
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          step="100"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note (Optional)</Label>
        <Input
          id="note"
          placeholder="e.g., Monthly savings, Birthday gift"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* Preview */}
      {amount && parseFloat(amount) > 0 && (
        <div className="bg-muted p-3 rounded-lg text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Balance:</span>
            <span>{formatCurrency(goal?.current || 0, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{operation === 'deposit' ? 'Adding:' : 'Removing:'}</span>
            <span className={operation === 'deposit' ? 'text-success' : 'text-destructive'}>
              {operation === 'deposit' ? '+' : '-'}{formatCurrency(parseFloat(amount), currency)}
            </span>
          </div>
          <div className="flex justify-between font-bold border-t border-border mt-2 pt-2">
            <span>New Balance:</span>
            <span>
              {formatCurrency(
                operation === 'deposit' 
                  ? (goal?.current || 0) + parseFloat(amount)
                  : Math.max(0, (goal?.current || 0) - parseFloat(amount)),
                currency
              )}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleDeposit} 
          className="flex-1" 
          disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
          variant={operation === 'withdrawal' ? 'destructive' : 'default'}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {operation === 'deposit' ? 'Deposit' : 'Withdraw'}
        </Button>
      </div>
    </div>
  );
}
