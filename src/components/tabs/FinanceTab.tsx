import { useState } from 'react';
import { 
  TrendingUp, DollarSign, Wallet, Plus, Edit2, Trash2, X, 
  Sparkles, Loader2, MessageCircle, RefreshCw, Wand2, CreditCard, PiggyBank, Receipt
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Transaction, Subscription, Budget, ChatMessage, SavingsGoal } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { CHART_COLORS } from '@/lib/constants';
import { Modal } from '@/components/Modal';
import { ChatInterface } from '@/components/ChatInterface';
import { toast } from 'sonner';

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
  setCurrency: (c: string) => void;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  safeDailySpend: number;
  totalFixedCosts: number;
  expenseData: { name: string; value: number }[];
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
  };
  setNewTransaction: React.Dispatch<React.SetStateAction<{
    type: 'income' | 'expense';
    amount: string;
    category: string;
    description: string;
    date: string;
  }>>;
  editingTransactionId: string | number | null;
  setEditingTransactionId: (id: string | number | null) => void;
  currentMonthIncome: number;
}

type FinanceSubTab = 'overview' | 'budgets' | 'savings';

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
  setCurrency,
  totalIncome,
  balance,
  safeDailySpend,
  totalFixedCosts,
  expenseData,
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
  currentMonthIncome,
}: FinanceTabProps) {
  const [isFinanceChatOpen, setIsFinanceChatOpen] = useState(false);
  const [financeTab, setFinanceTab] = useState<FinanceSubTab>('overview');
  const [financeMonthFilter, setFinanceMonthFilter] = useState(new Date().toISOString().slice(0, 7));

  const filteredTransactions = transactions.filter(t => t.date.startsWith(financeMonthFilter));

  const getBudgetProgress = (cat: string) => {
    const limit = budgets[cat] || 0;
    if (limit === 0) return null;
    const spent = transactions
      .filter(t => t.type === 'expense' && t.category === cat && t.date.startsWith(financeMonthFilter))
      .reduce((acc, curr) => acc + curr.amount, 0);
    return { spent, limit, pct: Math.min((spent / limit) * 100, 100) };
  };

  const calculateSmartBudgets = () => {
    const income = currentMonthIncome > 0 ? currentMonthIncome : totalIncome;
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

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransaction.amount || !newTransaction.description || !newTransaction.date) return;
    
    const tData = {
      ...newTransaction,
      amount: parseFloat(newTransaction.amount),
      category: newTransaction.type === 'income' ? 'Income' : newTransaction.category
    };

    if (editingTransactionId) {
      setTransactions(prev => prev.map(t => 
        String(t.id) === String(editingTransactionId) ? { ...tData, id: t.id } as Transaction : t
      ));
      setEditingTransactionId(null);
    } else {
      setTransactions(prev => 
        [{ ...tData, id: Date.now() } as Transaction, ...prev]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
    }
    
    setNewTransaction({
      type: 'income',
      amount: '',
      category: categories[0],
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleSavingsUpdate = (goalId: string | number, amount: number, operation: 'deposit' | 'withdraw') => {
    setSavingsGoals(prev => prev.map(goal => {
      if (String(goal.id) === String(goalId)) {
        const current = goal.current || 0;
        const newBalance = operation === 'deposit' ? current + amount : Math.max(0, current - amount);
        return { ...goal, current: newBalance };
      }
      return goal;
    }));
    toast.success(operation === 'deposit' ? "Deposit successful!" : "Withdrawal successful!");
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      {/* Sub-Tab Navigation */}
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

      {/* Overview Tab */}
      {financeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-success/10 p-4 md:p-6 rounded-xl border border-success/20 shadow-soft">
              <div className="flex items-center gap-2 text-success mb-1 md:mb-2 font-medium text-sm md:text-base">
                <TrendingUp size={18} className="shrink-0" /> Income
              </div>
              <div className="text-lg md:text-3xl font-bold text-success truncate">
                {formatCurrency(totalIncome, currency)}
              </div>
            </div>
            
            <div className="bg-primary/10 p-4 md:p-6 rounded-xl border border-primary/20 shadow-soft">
              <div className="flex items-center gap-2 text-primary mb-1 md:mb-2 font-medium text-sm md:text-base">
                <Wallet size={18} className="shrink-0" /> <span className="truncate">Safe Daily Spend</span>
              </div>
              <div className="text-lg md:text-3xl font-bold text-primary truncate">
                {formatCurrency(safeDailySpend, currency)}
              </div>
              <span className="text-xs text-primary/70 font-normal hidden md:block mt-1">After bills & current spend</span>
            </div>
            
            <div className="bg-card p-4 md:p-6 rounded-xl border border-border shadow-soft relative">
              <button 
                onClick={() => setCurrency(currency === '₦' ? '$' : '₦')} 
                className="absolute top-2 right-2 bg-muted p-1 rounded text-xs font-bold text-primary"
              >
                <RefreshCw size={12} />
              </button>
              <div className="flex items-center gap-2 text-primary mb-1 md:mb-2 font-medium text-sm md:text-base">
                <DollarSign size={18} className="shrink-0" /> Balance
              </div>
              <div className={`text-lg md:text-3xl font-bold truncate ${balance >= 0 ? 'text-card-foreground' : 'text-destructive'}`}>
                {formatCurrency(balance, currency)}
              </div>
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
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-primary">
                    <Receipt size={14} />
                    {isScanningReceipt ? <Loader2 className="animate-spin" size={14} /> : 'Scan Receipt'}
                    <input type="file" accept="image/*" onChange={onReceiptScan} className="hidden" />
                  </label>
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
                      className="w-full p-2 md:p-3 text-xs md:text-sm border border-border rounded-lg bg-muted focus:ring-2 focus:ring-primary/20 outline-none" 
                      required 
                    />
                  </div>
                  <div className="col-span-2 md:col-span-4">
                    <input 
                      type="number" 
                      placeholder="Amount" 
                      value={newTransaction.amount} 
                      onChange={e => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                      className="w-full p-2.5 md:p-3 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" 
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
                          className="w-full p-2.5 md:p-3 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none pr-10" 
                          required 
                        />
                        <button 
                          type="button" 
                          onClick={onAutoCategorize} 
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/60 hover:text-primary p-1" 
                          title="Auto-Categorize"
                        >
                          {isCategorizing ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 md:col-span-12">
                      <input 
                        type="text" 
                        placeholder="Description" 
                        value={newTransaction.description} 
                        onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
                        className="w-full p-2.5 md:p-3 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" 
                        required 
                      />
                    </div>
                  )}
                  
                  <div className="col-span-2 md:col-span-12">
                    <button 
                      type="submit" 
                      className={`w-full py-2.5 md:py-3 rounded-lg font-medium text-sm md:text-base text-secondary-foreground ${
                        editingTransactionId ? 'bg-primary' : 'bg-secondary'
                      }`}
                    >
                      {editingTransactionId ? 'Update' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Recent Records with Month Filter */}
              <div className="bg-card p-4 md:p-6 rounded-xl shadow-soft border border-border">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h3 className="font-bold text-card-foreground text-sm md:text-base">Recent Records</h3>
                  <input
                    type="month"
                    value={financeMonthFilter}
                    onChange={(e) => setFinanceMonthFilter(e.target.value)}
                    className="text-xs bg-muted border border-border rounded-lg p-2"
                  />
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredTransactions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm bg-muted rounded-lg border border-dashed border-border">
                      No transactions found for this month.
                    </div>
                  ) : filteredTransactions.map((t, idx) => (
                    <div key={`${t.id}-${idx}`} className="flex justify-between items-start md:items-center p-2.5 md:p-3 bg-muted rounded-lg text-sm border border-border/50 gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-card-foreground text-xs md:text-sm truncate">{t.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(t.date).toLocaleDateString()} • {t.category || 'Income'}
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
                          onClick={() => onOpenModal('editSubscription', { id: sub.id, value: `${sub.name} ${sub.amount}` })} 
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
                <div className="h-36 md:h-40 w-full mb-3 md:mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={expenseData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={35} 
                        outerRadius={55} 
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
                  <MessageCircle size={14} /> Chat with Finance Expert
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Budgets Tab */}
      {financeTab === 'budgets' && (
        <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-card p-8 rounded-xl shadow-soft border border-border">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <span className="font-bold text-card-foreground flex items-center gap-2 text-lg">
                        {cat} 
                        <button onClick={() => onOpenModal('setBudget', cat)} className="text-muted-foreground hover:text-primary">
                          <Edit2 size={14}/>
                        </button>
                      </span>
                      <span className={`text-sm font-bold ${progress.spent > progress.limit ? 'text-destructive' : 'text-muted-foreground'}`}>
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
          <div className="bg-card p-8 rounded-xl shadow-soft border border-border">
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
            <div className="space-y-4">
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
                  <div key={goal.id} className="bg-primary/5 p-6 rounded-xl border border-primary/20 relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="flex-1">
                        <h4 className="font-bold text-xl text-card-foreground">{goal.name}</h4>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onOpenModal('editSavingsDeposit', { id: goal.id, current: goal.current, name: goal.name })} 
                          className="bg-card border border-primary/20 text-primary px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-primary/10 transition-colors"
                        >
                          Update Balance
                        </button>
                        <button 
                          onClick={() => onOpenModal('deleteSavings', goal.id)} 
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={18}/>
                        </button>
                      </div>
                    </div>
                    
                    {/* Separate columns for Target and Current Balance */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-card p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Target Amount</p>
                        <p className="text-lg font-bold text-card-foreground">{formatCurrency(goal.target, currency)}</p>
                      </div>
                      <div className="bg-card p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
                        <p className="text-lg font-bold text-success">{formatCurrency(goal.current, currency)}</p>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="flex justify-between text-sm font-bold text-card-foreground mb-2">
                        <span>Progress</span>
                        <span>{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-4 bg-card rounded-full overflow-hidden border border-primary/10 shadow-inner">
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
        title="Chat with Finance Expert" 
        maxWidth="max-w-2xl"
      >
        <ChatInterface 
          history={financeChatHistory} 
          onSend={onFinanceChat} 
          isLoading={isAnalyzingFinance} 
          placeholder="Ask about budgeting, savings, or investments..." 
          personaName="Finance Expert"
        />
      </Modal>
    </div>
  );
}
