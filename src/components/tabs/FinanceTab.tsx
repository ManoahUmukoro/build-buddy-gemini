import { useState, useMemo } from 'react';
import { 
  TrendingUp, DollarSign, Wallet, Plus, Edit2, Trash2, X, 
  Sparkles, Loader2, MessageCircle, Wand2, CreditCard, PiggyBank, Receipt,
  History, MoreVertical, Filter, ChevronDown, Calculator, FileUp, Building2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Transaction, Subscription, Budget, ChatMessage, SavingsGoal } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { CHART_COLORS } from '@/lib/constants';
import { Modal } from '@/components/Modal';
import { ChatInterface } from '@/components/ChatInterface';
import { SavingsEntriesHistory } from '@/components/SavingsEntriesHistory';
import { useEntitlements } from '@/hooks/useEntitlements';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AccountSelector } from '@/components/AccountSelector';
import { BankAccountModal } from '@/components/BankAccountModal';
import { BankStatementUpload } from '@/components/BankStatementUpload';
import { FreelancerPricingTool } from '@/components/FreelancerPricingTool';
import { TransactionSourceBadge } from '@/components/TransactionSourceBadge';
import { AccountBalanceCards } from '@/components/AccountBalanceCards';
import { useBankAccounts, BankAccount } from '@/hooks/useBankAccounts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface FinanceTabProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  subscriptions: Subscription[];
  setSubscriptions: React.Dispatch<React.SetStateAction<Subscription[]>>;
  savingsGoals: SavingsGoal[];
  setSavingsGoals: React.Dispatch<React.SetStateAction<SavingsGoal[]>>;
  budgets: Budget;
  setBudgets: React.Dispatch<React.SetStateAction<Budget>>;
  categories: string[];
  currency: string;
  // Removed: totalIncome, totalExpense, balance, safeDailySpend, expenseData - now calculated locally with account filtering
  totalFixedCosts: number;
  financeAnalysis: string;
  isAnalyzingFinance: boolean;
  financeChatHistory: ChatMessage[];
  onAnalyzeFinances: () => void;
  onFinanceChat: (text: string, imageBase64: string | null) => void;
  onAutoCategorize: () => void;
  onReceiptScan: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCategorizing: boolean;
  isScanningReceipt: boolean;
  onOpenModal: (type: string, data?: any) => void;
  newTransaction: {
    type: 'income' | 'expense';
    amount: string;
    category: string;
    description: string;
    date: string;
    bank_account_id?: string | null;
  };
  setNewTransaction: React.Dispatch<React.SetStateAction<{
    type: 'income' | 'expense';
    amount: string;
    category: string;
    description: string;
    date: string;
    bank_account_id?: string | null;
  }>>;
  editingTransactionId: string | number | null;
  setEditingTransactionId: (id: string | number | null) => void;
}

type FinanceSubTab = 'overview' | 'budgets' | 'savings';

// Helper to format date headers
function formatDateHeader(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function FinanceTab({
  transactions,
  setTransactions,
  subscriptions,
  savingsGoals,
  setSavingsGoals,
  budgets,
  setBudgets,
  categories,
  currency,
  totalFixedCosts,
  financeAnalysis,
  isAnalyzingFinance,
  financeChatHistory,
  onAnalyzeFinances,
  onFinanceChat,
  onAutoCategorize,
  onReceiptScan,
  isCategorizing,
  isScanningReceipt,
  onOpenModal,
  newTransaction,
  setNewTransaction,
  editingTransactionId,
  setEditingTransactionId,
}: FinanceTabProps) {
  const { user } = useAuth();
  const [isFinanceChatOpen, setIsFinanceChatOpen] = useState(false);
  const [financeTab, setFinanceTab] = useState<FinanceSubTab>('overview');
  const [financeMonthFilter, setFinanceMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { canScanReceipts, canAutoCategorize } = useEntitlements();

  // Bank accounts state
  const { 
    accounts, 
    loading: accountsLoading, 
    selectedAccountId, 
    setSelectedAccountId,
    createAccount,
    updateAccount,
    deleteAccount
  } = useBankAccounts();
  const [isBankAccountModalOpen, setIsBankAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [isBankUploadOpen, setIsBankUploadOpen] = useState(false);
  const [isFreelancerToolOpen, setIsFreelancerToolOpen] = useState(false);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAmountMin, setFilterAmountMin] = useState<string>('');
  const [filterAmountMax, setFilterAmountMax] = useState<string>('');

  // =============== ACCOUNT-FILTERED CALCULATIONS ===============
  // Filter transactions by selected account
  const accountFilteredTransactions = useMemo(() => {
    if (selectedAccountId === 'all') {
      return transactions;
    }
    return transactions.filter(t => t.bank_account_id === selectedAccountId);
  }, [transactions, selectedAccountId]);

  // Calculate income/expense for the selected account(s) for current month
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const currentMonthTransactions = useMemo(() => {
    return accountFilteredTransactions.filter(t => t.date.startsWith(currentMonthStr));
  }, [accountFilteredTransactions, currentMonthStr]);

  const totalIncome = useMemo(() => {
    return currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const totalExpense = useMemo(() => {
    return currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  // Calculate balance including opening balance
  const balance = useMemo(() => {
    const transactionBalance = totalIncome - totalExpense;
    if (selectedAccountId !== 'all') {
      const account = accounts.find(a => a.id === selectedAccountId);
      return (account?.opening_balance || 0) + transactionBalance;
    }
    // For all accounts, sum opening balances + transaction balances
    const totalOpening = accounts.reduce((sum, a) => sum + (a.opening_balance || 0), 0);
    return totalOpening + transactionBalance;
  }, [selectedAccountId, accounts, totalIncome, totalExpense]);

  // Safe Daily Spend - account filtered
  const safeDailySpend = useMemo(() => {
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(1, daysInMonth - today.getDate());
    
    const totalSavingsGoals = savingsGoals.reduce((acc, g) => acc + Math.max(0, g.target - g.current), 0);
    const remainingBudget = (totalIncome - totalExpense) - totalFixedCosts - totalSavingsGoals;
    return Math.max(0, remainingBudget / daysLeft);
  }, [totalIncome, totalExpense, totalFixedCosts, savingsGoals, today]);

  // Expense data for charts - account filtered
  const expenseData = useMemo(() => {
    return categories.map(cat => ({
      name: cat,
      value: currentMonthTransactions
        .filter(t => t.type === 'expense' && t.category === cat)
        .reduce((sum, t) => sum + t.amount, 0)
    })).filter(item => item.value > 0);
  }, [currentMonthTransactions, categories]);

  // =============== END ACCOUNT-FILTERED CALCULATIONS ===============

  // Apply all filters including account filter for the transaction list display
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => t.date.startsWith(financeMonthFilter))
      .filter(t => filterType === 'all' || t.type === filterType)
      .filter(t => filterCategory === 'all' || t.category === filterCategory)
      .filter(t => {
        const min = parseFloat(filterAmountMin) || 0;
        const max = parseFloat(filterAmountMax) || Infinity;
        return t.amount >= min && t.amount <= max;
      })
      .filter(t => selectedAccountId === 'all' || t.bank_account_id === selectedAccountId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, financeMonthFilter, filterType, filterCategory, filterAmountMin, filterAmountMax, selectedAccountId]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  // Sorted date keys (newest first)
  const sortedDates = useMemo(() => {
    return Object.keys(groupedTransactions).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [groupedTransactions]);

  // Get unique categories from transactions
  const uniqueCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).filter(Boolean);
  }, [transactions]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'all') count++;
    if (filterCategory !== 'all') count++;
    if (filterAmountMin) count++;
    if (filterAmountMax) count++;
    return count;
  }, [filterType, filterCategory, filterAmountMin, filterAmountMax]);

  const clearFilters = () => {
    setFilterType('all');
    setFilterCategory('all');
    setFilterAmountMin('');
    setFilterAmountMax('');
  };

  const getBudgetProgress = (cat: string) => {
    const limit = budgets[cat] || 0;
    if (limit === 0) return null;
    const spent = transactions
      .filter(t => t.type === 'expense' && t.category === cat && t.date.startsWith(financeMonthFilter))
      .reduce((acc, curr) => acc + curr.amount, 0);
    return { spent, limit, pct: Math.min((spent / limit) * 100, 100) };
  };

  const calculateSmartBudgets = () => {
    const income = totalIncome > 0 ? totalIncome : 0;
    if (income === 0) return toast.error("Log some income first!");
    
    // 50/30/20 Rule
    const needs = income * 0.50;
    const wants = income * 0.30;
    const savings = income * 0.20;

    const newBudgets = { ...budgets };
    
    newBudgets['Rent/Bills'] = needs * 0.6;
    newBudgets['Food'] = needs * 0.25;
    newBudgets['Transport'] = needs * 0.15;
    newBudgets['Entertainment'] = wants * 0.5;
    newBudgets['Shopping'] = wants * 0.5;
    newBudgets['Health'] = savings * 0.3;
    newBudgets['Education'] = savings * 0.3;
    newBudgets['Savings'] = savings * 0.4;

    setBudgets(newBudgets);
    toast.success("Budgets allocated (50/30/20)!");
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransaction.amount || !newTransaction.description || !newTransaction.date || isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Get the default bank account for new transactions
    const primaryAccount = accounts.find(a => a.is_primary) || accounts[0];
    const bankAccountId = newTransaction.bank_account_id || 
      (selectedAccountId !== 'all' ? selectedAccountId : primaryAccount?.id) || null;

    const tData: Transaction = {
      id: editingTransactionId || Date.now(),
      type: newTransaction.type,
      amount: parseFloat(newTransaction.amount),
      category: newTransaction.type === 'income' ? 'Income' : newTransaction.category,
      description: newTransaction.description,
      date: newTransaction.date,
      bank_account_id: bankAccountId,
      source: 'manual' as const,
      external_reference: null
    };

    if (editingTransactionId) {
      setTransactions(prev => prev.map(t => 
        String(t.id) === String(editingTransactionId) ? tData : t
      ));
      setEditingTransactionId(null);
    } else {
      setTransactions(prev => 
        [tData, ...prev]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
    }
    
    setNewTransaction({
      type: 'income',
      amount: '',
      category: categories[0],
      description: '',
      date: new Date().toISOString().split('T')[0],
      bank_account_id: null
    });
    setIsSubmitting(false);
  };

  // Bank account handlers
  const handleSaveAccount = async (data: Omit<BankAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (editingAccount) {
      await updateAccount(editingAccount.id, data);
    } else {
      await createAccount(data);
    }
    setEditingAccount(null);
  };

  const handleDeleteAccount = async (id: string) => {
    const success = await deleteAccount(id);
    return success;
  };

  const handleBankStatementImport = async (
    parsedTransactions: Array<{ date: string; amount: number; type: string; description: string; category?: string }>,
    accountId: string
  ) => {
    if (!user) return;
    
    try {
      const transactionsToInsert = parsedTransactions.map(t => ({
        user_id: user.id,
        bank_account_id: accountId,
        date: t.date,
        amount: t.amount,
        type: t.type,
        description: t.description,
        category: t.category || (t.type === 'income' ? 'Income' : 'Other'),
        source: 'bank_import' as const,
      }));

      const { error } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);

      if (error) throw error;
      
      toast.success(`Imported ${parsedTransactions.length} transactions!`);
      setIsBankUploadOpen(false);
      // Refresh transactions (parent component should handle this)
    } catch (error) {
      console.error('Error importing transactions:', error);
      toast.error('Failed to import transactions');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      {/* Sub-Tab Navigation + Account Selector */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'overview' as FinanceSubTab, label: 'Overview', icon: DollarSign },
            { id: 'budgets' as FinanceSubTab, label: 'Budgets', icon: CreditCard },
            { id: 'savings' as FinanceSubTab, label: 'Savings', icon: PiggyBank },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFinanceTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                financeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'bg-card text-muted-foreground hover:bg-accent border border-border'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Account Selector & Tools */}
        {financeTab === 'overview' && (
          <div className="flex items-center gap-2">
            <AccountSelector
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelect={setSelectedAccountId}
              onAddAccount={() => {
                setEditingAccount(null);
                setIsBankAccountModalOpen(true);
              }}
              onManageAccounts={() => {
                // Open the currently selected account, or primary if "all" is selected
                const accountToEdit = selectedAccountId !== 'all' 
                  ? accounts.find(a => a.id === selectedAccountId)
                  : (accounts.find(a => a.is_primary) || accounts[0]);
                if (accountToEdit) {
                  setEditingAccount(accountToEdit);
                  setIsBankAccountModalOpen(true);
                }
              }}
            />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Building2 size={14} />
                  <span className="hidden sm:inline">Tools</span>
                  <ChevronDown size={12} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsBankUploadOpen(true)}>
                  <FileUp size={14} className="mr-2" />
                  Import Statement
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsFreelancerToolOpen(true)}>
                  <Calculator size={14} className="mr-2" />
                  Rate Calculator
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Overview Tab */}
      {financeTab === 'overview' && (
        <>
          {/* Account Balance Cards */}
          {accounts.length > 0 && (
            <div className="bg-card p-4 md:p-6 rounded-xl shadow-soft border border-border">
              <AccountBalanceCards
                accounts={accounts}
                transactions={transactions}
                currency={currency}
                selectedAccountId={selectedAccountId}
                onSelectAccount={setSelectedAccountId}
              />
            </div>
          )}

          {/* Stats Cards - 3-Card System */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            {/* Card 1: Income & Balance Combined */}
            <div className="bg-card p-4 md:p-6 rounded-xl shadow-soft">
              <div className="flex items-center gap-2 text-success mb-2 font-medium text-sm">
                <TrendingUp size={16} className="shrink-0" /> Income
              </div>
              <div className="text-lg md:text-2xl font-bold text-success truncate mb-3">
                {formatCurrency(totalIncome, currency)}
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1 font-medium text-xs">
                  <DollarSign size={14} className="shrink-0" /> Balance
                </div>
                <div className={`text-base md:text-xl font-bold truncate ${balance >= 0 ? 'text-card-foreground' : 'text-destructive'}`}>
                  {formatCurrency(balance, currency)}
                </div>
              </div>
            </div>
            
            {/* Card 2: Expenses */}
            <div className="bg-destructive/10 p-4 md:p-6 rounded-xl shadow-soft">
              <div className="flex items-center gap-2 text-destructive mb-1 md:mb-2 font-medium text-sm md:text-base">
                <Wallet size={18} className="shrink-0" /> Expenses
              </div>
              <div className="text-lg md:text-3xl font-bold text-destructive truncate">
                {formatCurrency(totalIncome - balance, currency)}
              </div>
              <span className="text-xs text-destructive/70 font-normal mt-1 block">This month</span>
            </div>
            
            {/* Card 3: Safe Daily Spend */}
            <div className="bg-primary/10 p-4 md:p-6 rounded-xl shadow-soft">
              <div className="flex items-center gap-2 text-primary mb-1 md:mb-2 font-medium text-sm md:text-base">
                <CreditCard size={18} className="shrink-0" /> <span className="truncate">Safe Daily Spend</span>
              </div>
              <div className="text-lg md:text-3xl font-bold text-primary truncate">
                {formatCurrency(safeDailySpend, currency)}
              </div>
              <span className="text-xs text-primary/70 font-normal mt-1 block">After bills & spending</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
            {/* LEFT COLUMN */}
            <div className="xl:col-span-7 space-y-4 md:space-y-6">
              {/* Transaction Form */}
              <div className="bg-card p-4 md:p-6 rounded-xl shadow-soft border border-border">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h3 className="font-bold text-card-foreground text-sm md:text-base">
                    {editingTransactionId ? 'Edit Record' : 'Add Transaction'}
                  </h3>
                  {canScanReceipts ? (
                    <label className="flex items-center gap-2 text-xs cursor-pointer text-muted-foreground hover:text-primary">
                      <Receipt size={14} />
                      {isScanningReceipt ? <Loader2 className="animate-spin" size={14} /> : 'Scan Receipt'}
                      <input type="file" accept="image/*" onChange={onReceiptScan} className="hidden" />
                    </label>
                  ) : (
                    <span className="flex items-center gap-2 text-xs text-muted-foreground/50 cursor-not-allowed" title="Pro feature">
                      <Receipt size={14} />
                      Scan Receipt
                    </span>
                  )}
                </div>
                <form onSubmit={handleTransactionSubmit} className="grid grid-cols-2 md:grid-cols-12 gap-2 md:gap-4">
                  <div className="col-span-1 md:col-span-4">
                    <select 
                      value={newTransaction.type} 
                      onChange={e => setNewTransaction({ ...newTransaction, type: e.target.value as 'income' | 'expense' })}
                      className="w-full p-2.5 md:p-3 text-sm border border-border rounded-lg bg-muted focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="income">Income (+)</option>
                      <option value="expense">Expense (-)</option>
                    </select>
                  </div>
                  <div className="col-span-1 md:col-span-4">
                    <input 
                      type="date" 
                      value={newTransaction.date} 
                      onChange={e => setNewTransaction({ ...newTransaction, date: e.target.value })}
                      className="w-full p-2 md:p-3 text-xs md:text-sm border border-border rounded-lg bg-muted focus:ring-2 focus:ring-primary/20 outline-none [color-scheme:light] dark:[color-scheme:dark]" 
                      required 
                    />
                  </div>
                  <div className="col-span-2 md:col-span-4">
                    <input 
                      type="number" 
                      placeholder="Amount" 
                      value={newTransaction.amount} 
                      onChange={e => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                      className="w-full p-2.5 md:p-3 text-sm rounded-lg bg-muted text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none [color-scheme:light] dark:[color-scheme:dark]" 
                      required 
                    />
                  </div>
                  
                  {newTransaction.type === 'expense' ? (
                    <>
                      <div className="col-span-2 md:col-span-5 flex gap-2">
                        <select 
                          value={newTransaction.category} 
                          onChange={e => setNewTransaction({ ...newTransaction, category: e.target.value })}
                          className="w-full p-2.5 md:p-3 text-sm border border-border rounded-lg bg-muted focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button 
                          type="button" 
                          onClick={() => onOpenModal('addCategory')} 
                          className="p-2.5 md:p-3 bg-muted rounded-lg shrink-0 hover:bg-accent"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      <div className="col-span-2 md:col-span-7 relative">
                        <input 
                          type="text" 
                          placeholder="Description" 
                          value={newTransaction.description} 
                          onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
                          className="w-full p-2.5 md:p-3 text-sm rounded-lg bg-muted text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none pr-10" 
                          required 
                        />
                        {canAutoCategorize && (
                          <button 
                            type="button" 
                            onClick={onAutoCategorize} 
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-primary/60 hover:text-primary"
                            title="Auto-Categorize"
                          >
                            {isCategorizing ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 md:col-span-12">
                      <input 
                        type="text" 
                        placeholder="Description" 
                        value={newTransaction.description} 
                        onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
                        className="w-full p-2.5 md:p-3 text-sm rounded-lg bg-muted text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none" 
                        required 
                      />
                    </div>
                  )}
                  
                  <div className="col-span-2 md:col-span-12">
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className={`w-full py-2.5 md:py-3 rounded-lg font-medium text-sm md:text-base text-secondary-foreground disabled:opacity-50 ${
                        editingTransactionId ? 'bg-primary' : 'bg-secondary'
                      }`}
                    >
                      {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={18} /> : editingTransactionId ? 'Update' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Recent Records with Filters */}
              <div className="bg-card p-4 md:p-6 rounded-xl shadow-soft border border-border">
                <div className="flex justify-between items-center mb-3 md:mb-4 gap-2 flex-wrap">
                  <h3 className="font-bold text-card-foreground text-sm md:text-base">Recent Records</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="month"
                      value={financeMonthFilter}
                      onChange={(e) => setFinanceMonthFilter(e.target.value)}
                      className="text-xs bg-muted border border-border rounded-lg p-2"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className={`text-xs ${activeFiltersCount > 0 ? 'border-primary text-primary' : ''}`}
                    >
                      <Filter size={14} className="mr-1" />
                      {activeFiltersCount > 0 ? `Filters (${activeFiltersCount})` : 'Filter'}
                      <ChevronDown size={12} className={`ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                </div>

                {/* Filter Panel */}
                <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                  <CollapsibleContent className="mb-4">
                    <div className="bg-muted/50 p-3 rounded-lg border border-border space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {/* Type Filter */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                          <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
                            className="w-full p-2 text-xs border border-border rounded-lg bg-background"
                          >
                            <option value="all">All</option>
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                          </select>
                        </div>

                        {/* Category Filter */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                          <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="w-full p-2 text-xs border border-border rounded-lg bg-background"
                          >
                            <option value="all">All Categories</option>
                            {uniqueCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        {/* Min Amount */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Min Amount</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={filterAmountMin}
                            onChange={(e) => setFilterAmountMin(e.target.value)}
                            className="w-full p-2 text-xs border border-border rounded-lg bg-background [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        </div>

                        {/* Max Amount */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Max Amount</label>
                          <input
                            type="number"
                            placeholder="∞"
                            value={filterAmountMax}
                            onChange={(e) => setFilterAmountMax(e.target.value)}
                            className="w-full p-2 text-xs border border-border rounded-lg bg-background [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        </div>
                      </div>

                      {activeFiltersCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          <X size={12} className="mr-1" /> Clear Filters
                        </Button>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Transaction List Grouped by Date */}
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {sortedDates.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm bg-muted rounded-lg border border-dashed border-border">
                      No transactions found for this month.
                    </div>
                  ) : (
                    sortedDates.map(date => (
                      <div key={date}>
                        {/* Date Header */}
                        <div className="sticky top-0 bg-card py-1.5 z-10">
                          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">
                            {formatDateHeader(date)}
                          </span>
                        </div>
                        
                        {/* Transactions for this date */}
                        <div className="space-y-2 mt-2">
                          {groupedTransactions[date].map((t, idx) => (
                            <div key={`${t.id}-${idx}`} className="flex justify-between items-start md:items-center p-2.5 md:p-3 bg-muted rounded-lg text-sm border border-border/50 gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-card-foreground text-xs md:text-sm truncate">{t.description}</span>
                                  <TransactionSourceBadge source={t.source} />
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {t.category || 'Income'}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                                <span className={`font-bold text-xs md:text-sm ${t.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                                </span>
                                <button 
                                  onClick={() => {
                                    setNewTransaction({
                                      type: t.type,
                                      amount: String(t.amount),
                                      category: t.category,
                                      description: t.description,
                                      date: t.date
                                    });
                                    setEditingTransactionId(t.id);
                                  }} 
                                  className="text-muted-foreground/50 hover:text-primary p-1"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={() => onOpenModal('deleteTransaction', t.id)} 
                                  className="text-muted-foreground/50 hover:text-destructive p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="xl:col-span-5 space-y-4 md:space-y-6">
              {/* Active Subscriptions */}
              <div className="bg-card p-4 md:p-6 rounded-xl shadow-soft border border-border">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h3 className="font-bold text-card-foreground text-sm md:text-base">Active Subscriptions</h3>
                  <button 
                    onClick={() => onOpenModal('addSubscription')} 
                    className="text-primary text-xs font-bold bg-primary/10 px-2 py-1 rounded hover:bg-primary/20"
                  >
                    + Add
                  </button>
                </div>
                <div className="space-y-2 md:space-y-3 max-h-48 overflow-y-auto">
                  {subscriptions.map(sub => (
                    <div key={sub.id} className="flex justify-between items-center text-xs md:text-sm p-2 bg-muted rounded border border-border/50 group">
                      <span className="font-medium text-card-foreground truncate">{sub.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground">{formatCurrency(sub.amount, currency)}</span>
                        <button 
                          onClick={() => onOpenModal('editSubscription', { id: sub.id, name: sub.name, amount: sub.amount })} 
                          className="text-muted-foreground/50 hover:text-primary p-1 md:opacity-0 md:group-hover:opacity-100"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={() => onOpenModal('deleteSubscription', sub.id)} 
                          className="text-muted-foreground/50 hover:text-destructive"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {subscriptions.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center">No subscriptions added.</p>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs md:text-sm font-bold text-card-foreground">
                  <span>Total Subscriptions:</span>
                  <span>{formatCurrency(totalFixedCosts, currency)}</span>
                </div>
              </div>

              {/* Spending Chart */}
              <div className="bg-card p-4 md:p-6 rounded-xl shadow-soft border border-border">
                <h3 className="font-bold text-card-foreground mb-2 text-sm md:text-base">Spending Chart</h3>
                <div className="py-4 md:py-6 w-full overflow-x-auto scrollbar-hide">
                  <div className="min-w-[280px] h-48 md:h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={expenseData} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={40} 
                          outerRadius={65} 
                          paddingAngle={5} 
                          dataKey="value"
                        >
                          {expenseData.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val) => formatCurrency(val as number, currency)} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <button 
                  onClick={onAnalyzeFinances} 
                  disabled={isAnalyzingFinance || transactions.length === 0} 
                  className="w-full bg-primary/10 text-primary hover:bg-primary/20 py-2 rounded-lg font-medium text-xs md:text-sm flex items-center justify-center gap-2 mb-2"
                >
                  {isAnalyzingFinance ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                  {isAnalyzingFinance ? 'Checking...' : 'Quick Check'}
                </button>
                {financeAnalysis && (
                  <div className="bg-primary/10 p-2.5 md:p-3 rounded-lg text-xs text-card-foreground whitespace-pre-wrap">
                    {financeAnalysis}
                  </div>
                )}
                <button 
                  onClick={() => setIsFinanceChatOpen(true)} 
                  className="w-full mt-3 md:mt-4 bg-secondary text-secondary-foreground py-2 rounded-lg text-xs md:text-sm font-medium flex items-center justify-center gap-2"
                >
                  <MessageCircle size={14} /> Chat with Nexer
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Budgets Tab */}
      {financeTab === 'budgets' && (
        <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-card p-4 md:p-8 rounded-xl shadow-soft border border-border">
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4 gap-2">
              <div>
                <h3 className="font-bold text-card-foreground text-lg md:text-xl flex items-center gap-2">
                  <CreditCard className="text-primary" size={20}/> Monthly Budgets
                </h3>
                <p className="text-muted-foreground text-xs md:text-sm mt-1">Set spending limits for each category.</p>
              </div>
              <button 
                onClick={calculateSmartBudgets} 
                className="bg-primary/10 text-primary border border-primary/20 px-3 py-2 rounded-lg text-xs md:text-sm font-bold hover:bg-primary/20 shadow-sm flex items-center gap-1 whitespace-nowrap transition-transform active:scale-95 shrink-0"
              >
                <Sparkles size={16} /> Auto-Allocate
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {categories.filter(c => c !== 'Income').map(cat => {
                const progress = getBudgetProgress(cat);
                if (!progress && !budgets[cat]) return (
                  <button 
                    key={cat} 
                    onClick={() => onOpenModal('setBudget', cat)} 
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-xl hover:bg-muted hover:border-primary/30 transition-all text-muted-foreground font-medium group"
                  >
                    <Plus size={16} className="group-hover:text-primary"/> Set Budget for {cat}
                  </button>
                );
                if (!progress) return null;
                return (
                  <div key={cat} className="group bg-muted p-4 rounded-xl border border-border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-card-foreground flex items-center gap-2 text-base md:text-lg">
                        {cat} 
                        <button onClick={() => onOpenModal('setBudget', cat)} className="text-muted-foreground hover:text-primary">
                          <Edit2 size={14}/>
                        </button>
                      </span>
                      <span className={`text-xs md:text-sm font-bold ${progress.spent > progress.limit ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {formatCurrency(progress.spent, currency)} 
                        <span className="text-muted-foreground font-normal"> / {formatCurrency(progress.limit, currency)}</span>
                      </span>
                    </div>
                    <div className="h-3 bg-card rounded-full overflow-hidden border border-border">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          progress.pct >= 100 ? 'bg-destructive' : progress.pct >= 80 ? 'bg-warning' : 'bg-success'
                        }`} 
                        style={{ width: `${progress.pct}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-right">{progress.pct.toFixed(0)}% used</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Savings Tab */}
      {financeTab === 'savings' && (
        <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-card p-4 md:p-8 rounded-xl shadow-soft border border-border">
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4 gap-2">
              <div>
                <h3 className="font-bold text-card-foreground text-lg md:text-xl flex items-center gap-2">
                  <PiggyBank className="text-primary" size={20}/> Savings Goals
                </h3>
                <p className="text-muted-foreground text-xs md:text-sm mt-1">Dream big, save bigger.</p>
              </div>
              <button 
                onClick={() => onOpenModal('addSavings')} 
                className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs md:text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 flex items-center gap-1 whitespace-nowrap transition-transform active:scale-95 shrink-0"
              >
                <Plus size={16}/> New Goal
              </button>
            </div>
            <div className="space-y-3 md:space-y-4">
              {savingsGoals.length === 0 && (
                <div className="text-center py-12 flex flex-col items-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                    <PiggyBank size={32}/>
                  </div>
                  <p className="text-muted-foreground font-medium">No savings goals set yet.</p>
                  <p className="text-muted-foreground/70 text-sm mt-1">Start saving for that new car, house, or vacation!</p>
                </div>
              )}
              {savingsGoals.map(goal => {
                const pct = Math.min((goal.current / goal.target) * 100, 100);
                return (
                  <div key={goal.id} className="bg-primary/5 p-4 md:p-6 rounded-xl border border-primary/20 relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                    <div className="flex justify-between items-start mb-3 md:mb-4 relative z-10 gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-lg md:text-xl text-card-foreground truncate">{goal.name}</h4>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <SavingsEntriesHistory
                          goalId={String(goal.id)}
                          goalName={goal.name}
                          currency={currency}
                        />
                        <Button 
                          onClick={() => onOpenModal('editSavingsDeposit', { id: goal.id, current: goal.current, name: goal.name })} 
                          variant="outline"
                          size="sm"
                          className="text-xs md:text-sm border-primary/20 text-primary hover:bg-primary/10"
                        >
                          Update Balance
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border border-border">
                            <DropdownMenuItem 
                              onClick={() => onOpenModal('deleteSavings', goal.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 size={14} className="mr-2" /> Delete Goal
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 md:gap-4 mb-3 md:mb-4">
                      <div className="bg-card p-2 md:p-3 rounded-lg border border-border">
                        <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Target Amount</p>
                        <p className="text-sm md:text-lg font-bold text-card-foreground">{formatCurrency(goal.target, currency)}</p>
                      </div>
                      <div className="bg-card p-2 md:p-3 rounded-lg border border-border">
                        <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Current Balance</p>
                        <p className="text-sm md:text-lg font-bold text-success">{formatCurrency(goal.current, currency)}</p>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="flex justify-between text-xs md:text-sm font-bold text-card-foreground mb-1 md:mb-2">
                        <span>Progress</span>
                        <span>{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-3 md:h-4 bg-card rounded-full overflow-hidden border border-primary/10 shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Finance Chat Modal */}
      <Modal 
        isOpen={isFinanceChatOpen} 
        onClose={() => setIsFinanceChatOpen(false)} 
        title="Chat with Nexer" 
        maxWidth="max-w-2xl"
      >
        <ChatInterface 
          history={financeChatHistory} 
          onSend={onFinanceChat} 
          isLoading={isAnalyzingFinance} 
          placeholder="Ask about budgeting, savings, or investments..." 
          personaName="Nexer"
        />
      </Modal>

      {/* Bank Account Modal */}
      <BankAccountModal
        isOpen={isBankAccountModalOpen}
        onClose={() => {
          setIsBankAccountModalOpen(false);
          setEditingAccount(null);
        }}
        account={editingAccount}
        onSave={handleSaveAccount}
        onDelete={handleDeleteAccount}
      />

      {/* Bank Statement Upload Modal */}
      <BankStatementUpload
        isOpen={isBankUploadOpen}
        onClose={() => setIsBankUploadOpen(false)}
        accounts={accounts}
        currency={currency}
        onImport={handleBankStatementImport}
      />

      {/* Freelancer Pricing Tool */}
      <FreelancerPricingTool
        isOpen={isFreelancerToolOpen}
        onClose={() => setIsFreelancerToolOpen(false)}
        currency={currency}
      />
    </div>
  );
}
