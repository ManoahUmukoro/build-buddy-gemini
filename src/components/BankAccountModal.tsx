import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Wallet, Banknote, Star, Loader2 } from 'lucide-react';
import { BankAccount } from '@/hooks/useBankAccounts';

interface BankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account?: BankAccount | null;
  onSave: (data: {
    bank_name: string;
    account_type: 'bank' | 'wallet' | 'cash';
    currency: string;
    opening_balance: number;
    is_primary?: boolean;
  }) => Promise<any>;
  onDelete?: (id: string) => Promise<boolean>;
}

const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Bank Account', icon: Building2 },
  { value: 'wallet', label: 'Digital Wallet', icon: Wallet },
  { value: 'cash', label: 'Cash', icon: Banknote },
] as const;

const CURRENCIES = [
  { value: 'NGN', label: '₦ NGN (Naira)' },
  { value: 'USD', label: '$ USD (Dollar)' },
  { value: 'GBP', label: '£ GBP (Pound)' },
  { value: 'EUR', label: '€ EUR (Euro)' },
];

export function BankAccountModal({
  isOpen,
  onClose,
  account,
  onSave,
  onDelete,
}: BankAccountModalProps) {
  const [formData, setFormData] = useState({
    bank_name: '',
    account_type: 'bank' as 'bank' | 'wallet' | 'cash',
    currency: 'NGN',
    opening_balance: 0,
    is_primary: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (account) {
      setFormData({
        bank_name: account.bank_name,
        account_type: account.account_type,
        currency: account.currency,
        opening_balance: account.opening_balance,
        is_primary: account.is_primary,
      });
    } else {
      setFormData({
        bank_name: '',
        account_type: 'bank',
        currency: 'NGN',
        opening_balance: 0,
        is_primary: false,
      });
    }
  }, [account, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bank_name.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!account || !onDelete) return;
    
    setIsDeleting(true);
    try {
      const success = await onDelete(account.id);
      if (success) onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={account ? 'Edit Account' : 'Add Bank Account'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account Name */}
        <div className="space-y-2">
          <Label htmlFor="bank_name">Account Name</Label>
          <Input
            id="bank_name"
            placeholder="e.g., Kuda, Opay, GTB Savings..."
            value={formData.bank_name}
            onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
            required
          />
        </div>

        {/* Account Type */}
        <div className="space-y-2">
          <Label>Account Type</Label>
          <div className="grid grid-cols-3 gap-2">
            {ACCOUNT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, account_type: type.value }))}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                  formData.account_type === type.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <type.icon size={20} />
                <span className="text-xs font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <select
            id="currency"
            value={formData.currency}
            onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            {CURRENCIES.map((curr) => (
              <option key={curr.value} value={curr.value}>{curr.label}</option>
            ))}
          </select>
        </div>

        {/* Opening Balance */}
        <div className="space-y-2">
          <Label htmlFor="opening_balance">Opening Balance</Label>
          <Input
            id="opening_balance"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.opening_balance || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              opening_balance: parseFloat(e.target.value) || 0 
            }))}
          />
          <p className="text-xs text-muted-foreground">
            Your current balance in this account
          </p>
        </div>

        {/* Primary Account Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Star size={16} className={formData.is_primary ? 'text-warning fill-warning' : 'text-muted-foreground'} />
            <div>
              <span className="text-sm font-medium">Primary Account</span>
              <p className="text-xs text-muted-foreground">Used as default for new transactions</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, is_primary: !prev.is_primary }))}
            className={`w-12 h-6 rounded-full transition-colors ${
              formData.is_primary ? 'bg-primary' : 'bg-border'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
              formData.is_primary ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {account && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1"
            >
              {isDeleting ? <Loader2 className="animate-spin" size={16} /> : 'Delete'}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="flex-1">
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : account ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
