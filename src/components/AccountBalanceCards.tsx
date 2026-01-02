import { Building2, CreditCard, Wallet } from 'lucide-react';
import { BankAccount } from '@/hooks/useBankAccounts';
import { Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { useMemo } from 'react';

interface AccountBalanceCardsProps {
  accounts: BankAccount[];
  transactions: Transaction[];
  currency: string;
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
}

export function AccountBalanceCards({
  accounts,
  transactions,
  currency,
  selectedAccountId,
  onSelectAccount,
}: AccountBalanceCardsProps) {
  // Calculate balance for each account
  const accountBalances = useMemo(() => {
    return accounts.map(account => {
      const accountTransactions = transactions.filter(
        t => t.bank_account_id === account.id
      );
      
      const transactionBalance = accountTransactions.reduce((sum, t) => {
        return t.type === 'income' ? sum + t.amount : sum - t.amount;
      }, 0);
      
      const totalBalance = (account.opening_balance || 0) + transactionBalance;
      
      return {
        ...account,
        transactionBalance,
        totalBalance,
        transactionCount: accountTransactions.length,
      };
    });
  }, [accounts, transactions]);

  // Calculate total across all accounts
  const totalBalance = useMemo(() => {
    return accountBalances.reduce((sum, acc) => sum + acc.totalBalance, 0);
  }, [accountBalances]);

  if (accounts.length === 0) {
    return null;
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return Wallet;
      case 'savings':
        return Building2;
      case 'credit':
        return CreditCard;
      default:
        return Wallet;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-card-foreground">Account Balances</h4>
        <span className="text-xs text-muted-foreground">
          Total: <span className={`font-bold ${totalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(totalBalance, currency)}
          </span>
        </span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {accountBalances.map(account => {
          const Icon = getAccountIcon(account.account_type);
          const isSelected = selectedAccountId === account.id;
          
          return (
            <button
              key={account.id}
              onClick={() => onSelectAccount(isSelected ? 'all' : account.id)}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                isSelected
                  ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20'
                  : 'bg-muted/50 border-border hover:bg-muted hover:border-border/80'
              }`}
            >
              <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/20' : 'bg-background'}`}>
                <Icon size={16} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-card-foreground'}`}>
                    {account.bank_name}
                  </span>
                  {account.is_primary && (
                    <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
                      Primary
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-base font-bold ${account.totalBalance >= 0 ? 'text-card-foreground' : 'text-destructive'}`}>
                    {formatCurrency(account.totalBalance, account.currency || currency)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ({account.transactionCount} txns)
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
