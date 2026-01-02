import { Building2, Wallet, Banknote, ChevronDown, Plus, Settings } from 'lucide-react';
import { BankAccount } from '@/hooks/useBankAccounts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface AccountSelectorProps {
  accounts: BankAccount[];
  selectedAccountId: string | 'all';
  onSelect: (accountId: string | 'all') => void;
  onAddAccount?: () => void;
  onManageAccounts?: () => void;
  showManage?: boolean;
}

const ACCOUNT_TYPE_ICONS = {
  bank: Building2,
  wallet: Wallet,
  cash: Banknote,
};

export function AccountSelector({
  accounts,
  selectedAccountId,
  onSelect,
  onAddAccount,
  onManageAccounts,
  showManage = true,
}: AccountSelectorProps) {
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  
  const getDisplayName = () => {
    if (selectedAccountId === 'all') return 'All Accounts';
    return selectedAccount?.bank_name || 'Select Account';
  };

  const getIcon = () => {
    if (selectedAccountId === 'all' || !selectedAccount) {
      return <Building2 size={16} className="text-muted-foreground" />;
    }
    const Icon = ACCOUNT_TYPE_ICONS[selectedAccount.account_type];
    return <Icon size={16} className="text-primary" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="justify-between min-w-[160px] gap-2 font-medium"
        >
          <div className="flex items-center gap-2">
            {getIcon()}
            <span className="truncate max-w-[120px]">{getDisplayName()}</span>
          </div>
          <ChevronDown size={14} className="shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* All Accounts Option */}
        <DropdownMenuItem 
          onClick={() => onSelect('all')}
          className={selectedAccountId === 'all' ? 'bg-primary/10 text-primary' : ''}
        >
          <Building2 size={16} className="mr-2" />
          All Accounts
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Individual Accounts */}
        {accounts.map((account) => {
          const Icon = ACCOUNT_TYPE_ICONS[account.account_type];
          return (
            <DropdownMenuItem
              key={account.id}
              onClick={() => onSelect(account.id)}
              className={selectedAccountId === account.id ? 'bg-primary/10 text-primary' : ''}
            >
              <Icon size={16} className="mr-2" />
              <span className="flex-1 truncate">{account.bank_name}</span>
              {account.is_primary && (
                <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded font-medium">
                  Primary
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
        
        {accounts.length === 0 && (
          <div className="py-2 px-2 text-sm text-muted-foreground text-center">
            No accounts yet
          </div>
        )}
        
        {(onAddAccount || (onManageAccounts && showManage)) && (
          <>
            <DropdownMenuSeparator />
            {onAddAccount && (
              <DropdownMenuItem onClick={onAddAccount}>
                <Plus size={16} className="mr-2" />
                Add Account
              </DropdownMenuItem>
            )}
            {onManageAccounts && showManage && (
              <DropdownMenuItem onClick={onManageAccounts}>
                <Settings size={16} className="mr-2" />
                Manage Accounts
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
