import { useState } from 'react';
import { 
  TrendingUp, DollarSign, Wallet, Plus, Edit2, Trash2, X, 
  Sparkles, Loader2, MessageCircle, RefreshCw, Wand2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Transaction, Subscription, Budget, ChatMessage } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { CHART_COLORS } from '@/lib/constants';
import { Modal } from '@/components/Modal';
import { ChatInterface } from '@/components/ChatInterface';

interface FinanceTabProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  subscriptions: Subscription[];
  setSubscriptions: React.Dispatch<React.SetStateAction<Subscription[]>>;
  budgets: Budget;
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
}

export function FinanceTab({
  transactions,
  setTransactions,
  subscriptions,
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
  isCategorizing,
  onOpenModal,
  newTransaction,
  setNewTransaction,
  editingTransactionId,
  setEditingTransactionId,
}: FinanceTabProps) {
  const [isFinanceChatOpen, setIsFinanceChatOpen] = useState(false);

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
      type: 'expense',
      amount: '',
      category: categories[0],
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Transaction Form */}
          <div className="bg-card p-4 md:p-6 rounded-xl shadow-soft border border-border">
            <div className="flex justify-between items-center mb-3 md:mb-4">
              <h3 className="font-bold text-card-foreground text-sm md:text-base">
                {editingTransactionId ? 'Edit Record' : 'Add Transaction'}
              </h3>
            </div>
            <form onSubmit={handleTransactionSubmit} className="grid grid-cols-2 md:grid-cols-12 gap-2 md:gap-4">
              <div className="col-span-1 md:col-span-4">
                <input 
                  type="date" 
                  value={newTransaction.date} 
                  onChange={e => setNewTransaction({ ...newTransaction, date: e.target.value })}
                  className="w-full p-2.5 md:p-3 text-sm border border-border rounded-lg bg-muted focus:ring-2 focus:ring-primary/20 outline-none" 
                  required 
                />
              </div>
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

          {/* Recent Records */}
          <div className="bg-card p-4 md:p-6 rounded-xl shadow-soft border border-border">
            <h3 className="font-bold text-card-foreground mb-3 md:mb-4 text-sm md:text-base">Recent Records</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {transactions.map((t, idx) => (
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

        <div className="space-y-4 md:space-y-6">
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
          personaName="Finance Expert" 
          placeholder="Ask about money..." 
        />
      </Modal>
    </div>
  );
}
