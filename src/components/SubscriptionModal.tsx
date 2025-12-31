import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SubscriptionModalProps {
  mode: 'add' | 'edit';
  initialName?: string;
  initialAmount?: number;
  currency: string;
  onSave: (name: string, amount: number) => void;
  onClose: () => void;
}

export function SubscriptionModal({ 
  mode, 
  initialName = '', 
  initialAmount = 0,
  currency,
  onSave, 
  onClose 
}: SubscriptionModalProps) {
  const [name, setName] = useState(initialName);
  const [amount, setAmount] = useState(initialAmount > 0 ? String(initialAmount) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(initialName);
    setAmount(initialAmount > 0 ? String(initialAmount) : '');
  }, [initialName, initialAmount]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter a subscription name');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setIsSubmitting(true);
    onSave(name.trim(), parseFloat(amount));
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <CreditCard className="text-primary" size={24} />
        </div>
        <div>
          <h3 className="font-bold text-lg">{mode === 'add' ? 'Add Subscription' : 'Edit Subscription'}</h3>
          <p className="text-sm text-muted-foreground">Track your recurring expenses</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sub-name">Subscription Name</Label>
        <Input
          id="sub-name"
          placeholder="e.g., Netflix, Spotify, Gym"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="text-foreground [color-scheme:light] dark:[color-scheme:dark]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sub-amount">Monthly Amount ({currency})</Label>
        <Input
          id="sub-amount"
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          step="100"
          className="text-foreground [color-scheme:light] dark:[color-scheme:dark]"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          className="flex-1" 
          disabled={!name.trim() || !amount || parseFloat(amount) <= 0 || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {mode === 'add' ? 'Add Subscription' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
