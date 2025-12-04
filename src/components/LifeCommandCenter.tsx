import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, MobileHeader, MobileNav } from '@/components/Navigation';
import { Modal } from '@/components/Modal';
import { DashboardTab } from '@/components/tabs/DashboardTab';
import { SystemsTab } from '@/components/tabs/SystemsTab';
import { FinanceTab } from '@/components/tabs/FinanceTab';
import { JournalTab } from '@/components/tabs/JournalTab';
import { SettingsTab } from '@/components/tabs/SettingsTab';
import { 
  Tasks, System, Transaction, JournalEntry, Budget, 
  Subscription, TabId, ModalConfig, ChatMessage 
} from '@/lib/types';
import { 
  loadTasks, loadSystems, loadTransactions, loadJournalEntries, 
  loadBudgets, loadCategories, loadSubscriptions, saveToStorage, exportAllData 
} from '@/lib/storage';
import { DEFAULT_CATEGORIES } from '@/lib/constants';
import { getCurrentDayIndex } from '@/lib/formatters';
import { Loader2, Sparkles } from 'lucide-react';

export default function LifeCommandCenter() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  
  // Modal State
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ isOpen: false, type: null, data: null });
  const [inputValue, setInputValue] = useState('');
  const [inputWhy, setInputWhy] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Task State
  const [tasks, setTasks] = useState<Tasks>(loadTasks);
  const [sortingDay, setSortingDay] = useState<string | null>(null);
  const [breakingDownTask, setBreakingDownTask] = useState<number | null>(null);
  
  // Systems State
  const [systems, setSystems] = useState<System[]>(loadSystems);
  
  // Finance State
  const [currency, setCurrency] = useState('₦');
  const [categories, setCategories] = useState<string[]>(loadCategories);
  const [transactions, setTransactions] = useState<Transaction[]>(loadTransactions);
  const [budgets, setBudgets] = useState<Budget>(loadBudgets);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(loadSubscriptions);
  const [newTransaction, setNewTransaction] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    category: categories[0] || 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [financeAnalysis, setFinanceAnalysis] = useState("");
  const [isAnalyzingFinance, setIsAnalyzingFinance] = useState(false);
  const [financeChatHistory, setFinanceChatHistory] = useState<ChatMessage[]>([]);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  
  // Journal State
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(loadJournalEntries);
  const [todayEntry, setTodayEntry] = useState({ mood: 3, win: '', improve: '', thoughts: '' });
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [journalChatHistory, setJournalChatHistory] = useState<ChatMessage[]>([]);
  
  // Dashboard State
  const [dailyBriefing, setDailyBriefing] = useState("Ready to conquer the day?");
  const [lifeAudit, setLifeAudit] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  
  // Pomodoro State
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [pomodoroActive, setPomodoroActive] = useState(false);

  // Persistence
  useEffect(() => { saveToStorage('tasks', tasks); }, [tasks]);
  useEffect(() => { saveToStorage('systems', systems); }, [systems]);
  useEffect(() => { saveToStorage('finance', transactions); }, [transactions]);
  useEffect(() => { saveToStorage('subscriptions', subscriptions); }, [subscriptions]);
  useEffect(() => { saveToStorage('categories', categories); }, [categories]);
  useEffect(() => { saveToStorage('budgets', budgets); }, [budgets]);
  useEffect(() => { saveToStorage('journal', journalEntries); }, [journalEntries]);

  // Pomodoro Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (pomodoroActive && pomodoroTime > 0) {
      interval = setInterval(() => setPomodoroTime(prev => prev - 1), 1000);
    } else if (pomodoroTime === 0) {
      setPomodoroActive(false);
      alert("Focus Session Complete!");
      setPomodoroTime(25 * 60);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [pomodoroActive, pomodoroTime]);

  // Derived Data
  const currentDayIndex = getCurrentDayIndex();
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;
  const totalFixedCosts = subscriptions.reduce((acc, sub) => acc + sub.amount, 0);
  
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - today.getDate());
  
  const currentMonthExpenses = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() && t.type === 'expense';
  }).reduce((acc, t) => acc + t.amount, 0);

  const currentMonthIncome = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() && t.type === 'income';
  }).reduce((acc, t) => acc + t.amount, 0);
  
  const remainingBudget = currentMonthIncome - totalFixedCosts - currentMonthExpenses;
  const safeDailySpend = Math.max(0, remainingBudget / daysLeft);

  const expenseData = categories.map(cat => ({
    name: cat,
    value: transactions.filter(t => t.type === 'expense' && t.category === cat).reduce((acc, curr) => acc + curr.amount, 0)
  })).filter(item => item.value > 0);

  const totalHabits = systems.reduce((acc, sys) => acc + sys.habits.length, 0);
  const completedHabits = systems.reduce((acc, sys) => acc + sys.habits.filter(h => h.completed[`d${currentDayIndex}`]).length, 0);

  // Modal Handlers
  const openModal = (type: string, data: any = null, initialValue = '', initialWhy = '') => {
    setModalConfig({ isOpen: true, type, data });
    setInputValue(initialValue);
    setInputWhy(initialWhy);
  };
  const closeModal = () => {
    setModalConfig({ isOpen: false, type: null, data: null });
    setInputValue('');
    setInputWhy('');
  };

  // AI Handlers (Placeholder - would connect to Lovable AI)
  const handleSmartSort = async (day: string) => {
    const currentTasks = tasks[day] || [];
    if (currentTasks.length < 2) return alert("Add at least 2 tasks to sort!");
    setSortingDay(day);
    // Simulate AI sorting
    setTimeout(() => {
      setTasks(prev => ({
        ...prev,
        [day]: [...(prev[day] || [])].sort(() => Math.random() - 0.5)
      }));
      setSortingDay(null);
    }, 1000);
  };

  const handleBreakdownTask = async (day: string, taskId: number, taskText: string) => {
    setBreakingDownTask(taskId);
    // Simulate AI breakdown
    setTimeout(() => {
      const newSubtasks = [
        { id: Date.now(), text: `↳ Step 1 for "${taskText}"`, done: false },
        { id: Date.now() + 1, text: `↳ Step 2 for "${taskText}"`, done: false },
        { id: Date.now() + 2, text: `↳ Step 3 for "${taskText}"`, done: false },
      ];
      setTasks(prev => {
        const currentDayTasks = prev[day] || [];
        const taskIndex = currentDayTasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return prev;
        const newTasks = [...currentDayTasks.slice(0, taskIndex + 1), ...newSubtasks, ...currentDayTasks.slice(taskIndex + 1)];
        return { ...prev, [day]: newTasks };
      });
      setBreakingDownTask(null);
    }, 1500);
  };

  const handleSmartDraft = (taskText: string) => {
    setIsGenerating(true);
    openModal('smartDraft');
    setTimeout(() => {
      setDraftText(`Draft email regarding "${taskText}":\n\nDear [Recipient],\n\nI hope this message finds you well. I wanted to reach out regarding ${taskText}.\n\nPlease let me know if you have any questions.\n\nBest regards`);
      setIsGenerating(false);
    }, 1500);
  };

  const handleLifeAudit = () => {
    setIsGenerating(true);
    openModal('lifeAudit');
    setTimeout(() => {
      setLifeAudit(`Based on your data:\n\n**Insight**: Your habit completion is at ${Math.round((completedHabits/totalHabits)*100)}% today. Your spending patterns show consistent behavior.\n\n**Recommendation**: Consider reviewing your fixed costs to optimize savings.`);
      setIsGenerating(false);
    }, 2000);
  };

  const handleDailyBriefing = () => {
    const totalTasks = Object.values(tasks).reduce((acc, dayTasks) => acc + dayTasks.length, 0);
    setDailyBriefing(`You have ${totalTasks} tasks across your week. Let's make today count!`);
  };

  const handleAnalyzeFinances = () => {
    if (transactions.length === 0) return alert("Add some money records first!");
    setIsAnalyzingFinance(true);
    setTimeout(() => {
      setFinanceAnalysis(`• Your balance is ${balance >= 0 ? 'healthy' : 'in deficit'}\n• Top spending category identified\n• Consider setting budget limits`);
      setIsAnalyzingFinance(false);
    }, 1500);
  };

  const handleFinanceChat = (text: string, imageBase64: string | null) => {
    setIsAnalyzingFinance(true);
    const userMsg: ChatMessage = { role: 'user', text };
    setFinanceChatHistory(prev => [...prev, userMsg]);
    setTimeout(() => {
      const response: ChatMessage = { role: 'model', text: `That's a great question about "${text}". Based on your financial data, I'd recommend focusing on your spending patterns and setting clear budget goals.` };
      setFinanceChatHistory(prev => [...prev, response]);
      setIsAnalyzingFinance(false);
    }, 1500);
  };

  const handleJournalChat = (text: string, imageBase64: string | null) => {
    setIsSavingJournal(true);
    const userMsg: ChatMessage = { role: 'user', text };
    setJournalChatHistory(prev => [...prev, userMsg]);
    setTimeout(() => {
      const response: ChatMessage = { role: 'model', text: `Thanks for sharing that. "${text}" - I hear you. Remember, every day is a new opportunity to grow and improve. What matters most is that you're reflecting on your experiences.` };
      setJournalChatHistory(prev => [...prev, response]);
      setIsSavingJournal(false);
    }, 1500);
  };

  const handleAutoCategorize = () => {
    if (!newTransaction.description) return alert("Enter a description first!");
    setIsCategorizing(true);
    setTimeout(() => {
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      setNewTransaction(prev => ({ ...prev, category: randomCategory }));
      setIsCategorizing(false);
    }, 1000);
  };

  const handleReceiptScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanningReceipt(true);
    setTimeout(() => {
      setNewTransaction(prev => ({
        ...prev,
        amount: String(Math.floor(Math.random() * 10000)),
        description: 'Scanned Receipt Item',
        type: 'expense'
      }));
      setIsScanningReceipt(false);
      alert("Receipt Scanned!");
    }, 2000);
  };

  const handleSaveJournal = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingJournal(true);
    const entryData: JournalEntry = {
      ...todayEntry,
      id: editingEntryId || Date.now(),
      date: editingEntryId ? journalEntries.find(e => e.id === editingEntryId)?.date || new Date().toLocaleDateString() : new Date().toLocaleDateString(),
      tags: todayEntry.thoughts.length > 10 ? ['#reflection', '#growth'] : undefined
    };
    
    if (editingEntryId) {
      setJournalEntries(prev => prev.map(e => e.id === editingEntryId ? entryData : e));
      setEditingEntryId(null);
    } else {
      setJournalEntries(prev => [entryData, ...prev]);
    }
    setTodayEntry({ mood: 3, win: '', improve: '', thoughts: '' });
    setIsSavingJournal(false);
  };

  const handleWeeklyReport = () => {
    if (journalEntries.length === 0) return alert("No entries!");
    setIsSavingJournal(true);
    setTimeout(() => {
      const response: ChatMessage = { role: 'model', text: `Weekly Summary: You've logged ${journalEntries.length} entries. Your average mood has been positive. Keep up the great work on self-reflection!` };
      setJournalChatHistory(prev => [...prev, response]);
      setIsSavingJournal(false);
    }, 1500);
  };

  // Modal Submit Handler
  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isDeleteAction = modalConfig.type?.startsWith('delete');
    if (!inputValue.trim() && !isDeleteAction) return;

    switch (modalConfig.type) {
      case 'addTask':
        setTasks(prev => ({
          ...prev,
          [modalConfig.data]: [...(prev[modalConfig.data] || []), { id: Date.now(), text: inputValue, done: false }]
        }));
        break;
      case 'editTask':
        const { day, taskId } = modalConfig.data;
        setTasks(prev => ({
          ...prev,
          [day]: prev[day]?.map(t => t.id === taskId ? { ...t, text: inputValue } : t) || []
        }));
        break;
      case 'generateSchedule':
        setIsGenerating(true);
        setTimeout(() => {
          const newItems = ['Morning routine', 'Deep work session', 'Exercise', 'Review goals'].map((text, i) => ({
            id: Date.now() + i,
            text,
            done: false
          }));
          setTasks(prev => ({
            ...prev,
            [modalConfig.data]: [...(prev[modalConfig.data] || []), ...newItems]
          }));
          setIsGenerating(false);
          closeModal();
        }, 1500);
        return;
      case 'addSystem':
        setSystems(prev => [...prev, { id: Date.now(), goal: inputValue, why: inputWhy || "To improve my life", habits: [] }]);
        break;
      case 'editSystem':
        setSystems(prev => prev.map(s => s.id === modalConfig.data ? { ...s, goal: inputValue, why: inputWhy } : s));
        break;
      case 'deleteSystem':
        setSystems(prev => prev.filter(s => s.id !== modalConfig.data));
        break;
      case 'addHabitToSystem':
        setSystems(prev => prev.map(s => s.id === modalConfig.data 
          ? { ...s, habits: [...s.habits, { id: Date.now(), name: inputValue, completed: {} }] } 
          : s
        ));
        break;
      case 'editHabit':
        const { systemId: editSysId, habitId: editHabId } = modalConfig.data;
        setSystems(prev => prev.map(s => s.id === editSysId 
          ? { ...s, habits: s.habits.map(h => h.id === editHabId ? { ...h, name: inputValue } : h) } 
          : s
        ));
        break;
      case 'deleteHabit':
        const { systemId: delSysId, habitId: delHabId } = modalConfig.data;
        setSystems(prev => prev.map(s => s.id === delSysId 
          ? { ...s, habits: s.habits.filter(h => h.id !== delHabId) } 
          : s
        ));
        break;
      case 'generateSystems':
        setIsGenerating(true);
        setTimeout(() => {
          const { systemId, goalName } = modalConfig.data;
          const newHabits = ['Daily practice', 'Weekly review', 'Track progress'].map((name, i) => ({
            id: Date.now() + i,
            name: `${name} for ${goalName}`,
            completed: {}
          }));
          setSystems(prev => prev.map(s => s.id === systemId ? { ...s, habits: [...s.habits, ...newHabits] } : s));
          setIsGenerating(false);
          closeModal();
        }, 1500);
        return;
      case 'setBudget':
        setBudgets(prev => ({ ...prev, [modalConfig.data]: parseFloat(inputValue) }));
        break;
      case 'addCategory':
        setCategories(prev => [...prev, inputValue]);
        break;
      case 'deleteTransaction':
        setTransactions(prev => prev.filter(tr => tr.id !== modalConfig.data));
        if (editingTransactionId === modalConfig.data) {
          setEditingTransactionId(null);
          setNewTransaction({ type: 'expense', amount: '', category: categories[0], description: '', date: new Date().toISOString().split('T')[0] });
        }
        break;
      case 'addSubscription':
        const parts = inputValue.split(' ');
        const potentialAmount = parseFloat(parts[parts.length - 1]);
        const subName = isNaN(potentialAmount) ? inputValue : parts.slice(0, -1).join(' ');
        const subAmount = isNaN(potentialAmount) ? 0 : potentialAmount;
        setSubscriptions(prev => [...prev, { id: Date.now(), name: subName, amount: subAmount }]);
        break;
      case 'editSubscription':
        const editParts = inputValue.split(' ');
        const editPotentialAmount = parseFloat(editParts[editParts.length - 1]);
        const editName = isNaN(editPotentialAmount) ? inputValue : editParts.slice(0, -1).join(' ');
        const editAmount = isNaN(editPotentialAmount) ? 0 : editPotentialAmount;
        setSubscriptions(prev => prev.map(s => s.id === modalConfig.data?.id ? { ...s, name: editName, amount: editAmount } : s));
        break;
      case 'deleteSubscription':
        setSubscriptions(prev => prev.filter(s => s.id !== modalConfig.data));
        break;
    }
    closeModal();
  };

  // Backup/Restore
  const handleBackup = () => {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeos_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm("Overwrite current data with backup?")) {
          if (data.tasks) setTasks(data.tasks);
          if (data.systems) setSystems(data.systems);
          if (data.transactions) setTransactions(data.transactions);
          if (data.journalEntries) setJournalEntries(data.journalEntries);
          if (data.budgets) setBudgets(data.budgets);
          if (data.categories) setCategories(data.categories);
          if (data.subscriptions) setSubscriptions(data.subscriptions);
          alert("Restored successfully!");
        }
      } catch (err) {
        alert("Error restoring data.");
      }
    };
    reader.readAsText(file);
  };

  // Get modal title
  const getModalTitle = () => {
    const typeMap: { [key: string]: string } = {
      generateSchedule: "AI Magic",
      generateSystems: "AI Magic",
      lifeAudit: "Life Audit",
      smartDraft: "Smart Draft",
      setBudget: "Set Budget",
      deleteTransaction: "Delete Record",
      deleteHabit: "Delete Habit",
      deleteSystem: "Delete Goal",
      deleteSubscription: "Delete Subscription",
      editSystem: "Edit Goal",
      editHabit: "Edit Habit",
      addSubscription: "Add Fixed Cost",
      editSubscription: "Edit Fixed Cost",
      addTask: "Add Task",
      editTask: "Edit Task",
      addSystem: "New Goal",
      addHabitToSystem: "Add Habit",
      addCategory: "Add Category",
    };
    return typeMap[modalConfig.type || ''] || "Input Required";
  };

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1 overflow-y-auto w-full">
          <MobileHeader />
          
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardTab
                tasks={tasks}
                setTasks={setTasks}
                completedHabits={completedHabits}
                totalHabits={totalHabits}
                balance={balance}
                currency={currency}
                dailyBriefing={dailyBriefing}
                pomodoroActive={pomodoroActive}
                pomodoroTime={pomodoroTime}
                setPomodoroActive={setPomodoroActive}
                setPomodoroTime={setPomodoroTime}
                sortingDay={sortingDay}
                breakingDownTask={breakingDownTask}
                onSmartSort={handleSmartSort}
                onBreakdownTask={handleBreakdownTask}
                onSmartDraft={handleSmartDraft}
                onLifeAudit={handleLifeAudit}
                onDailyBriefing={handleDailyBriefing}
                onOpenModal={openModal}
              />
            )}
            
            {activeTab === 'systems' && (
              <SystemsTab
                systems={systems}
                setSystems={setSystems}
                onOpenModal={openModal}
              />
            )}
            
            {activeTab === 'finance' && (
              <FinanceTab
                transactions={transactions}
                setTransactions={setTransactions}
                subscriptions={subscriptions}
                setSubscriptions={setSubscriptions}
                budgets={budgets}
                categories={categories}
                currency={currency}
                setCurrency={setCurrency}
                totalIncome={totalIncome}
                totalExpense={totalExpense}
                balance={balance}
                safeDailySpend={safeDailySpend}
                totalFixedCosts={totalFixedCosts}
                expenseData={expenseData}
                financeAnalysis={financeAnalysis}
                isAnalyzingFinance={isAnalyzingFinance}
                financeChatHistory={financeChatHistory}
                onAnalyzeFinances={handleAnalyzeFinances}
                onFinanceChat={handleFinanceChat}
                onAutoCategorize={handleAutoCategorize}
                onReceiptScan={handleReceiptScan}
                isCategorizing={isCategorizing}
                isScanningReceipt={isScanningReceipt}
                onOpenModal={openModal}
                newTransaction={newTransaction}
                setNewTransaction={setNewTransaction}
                editingTransactionId={editingTransactionId}
                setEditingTransactionId={setEditingTransactionId}
              />
            )}
            
            {activeTab === 'journal' && (
              <JournalTab
                journalEntries={journalEntries}
                setJournalEntries={setJournalEntries}
                todayEntry={todayEntry}
                setTodayEntry={setTodayEntry}
                editingEntryId={editingEntryId}
                setEditingEntryId={setEditingEntryId}
                isSavingJournal={isSavingJournal}
                journalChatHistory={journalChatHistory}
                onSaveJournal={handleSaveJournal}
                onJournalChat={handleJournalChat}
                onWeeklyReport={handleWeeklyReport}
              />
            )}
            
            {activeTab === 'settings' && (
              <SettingsTab
                onBackup={handleBackup}
                onRestore={handleRestore}
              />
            )}
          </div>
        </main>
        
        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
        
        {/* Modals */}
        <Modal isOpen={modalConfig.isOpen} onClose={closeModal} title={getModalTitle()}>
          {modalConfig.type === 'lifeAudit' && (
            <div className="space-y-4">
              {isGenerating ? (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="animate-spin text-primary mb-2" size={32} />
                  <p className="text-muted-foreground">Analyzing your life data...</p>
                </div>
              ) : (
                <>
                  <div className="bg-primary/10 p-4 rounded-xl text-sm text-card-foreground border border-primary/20 leading-relaxed">
                    <div className="flex items-center gap-2 font-bold mb-2 text-primary">
                      <Sparkles size={18} /> Life Audit Results:
                    </div>
                    <div className="whitespace-pre-wrap">{lifeAudit}</div>
                  </div>
                  <button onClick={closeModal} className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-bold hover:bg-secondary/80">
                    Close Report
                  </button>
                </>
              )}
            </div>
          )}
          
          {modalConfig.type === 'smartDraft' && (
            <div className="space-y-4">
              {isGenerating ? (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="animate-spin text-primary mb-2" size={32} />
                  <p className="text-muted-foreground">Drafting message...</p>
                </div>
              ) : (
                <>
                  <textarea readOnly className="w-full h-40 p-3 bg-muted border border-border rounded-xl text-sm" value={draftText} />
                  <button 
                    onClick={() => { navigator.clipboard.writeText(draftText); closeModal(); alert("Copied to clipboard!"); }} 
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90"
                  >
                    Copy to Clipboard
                  </button>
                </>
              )}
            </div>
          )}
          
          {modalConfig.type !== 'lifeAudit' && modalConfig.type !== 'smartDraft' && (
            modalConfig.type?.startsWith('delete') ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">Are you sure you want to delete this? This cannot be undone.</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={closeModal} className="px-4 py-2 bg-muted rounded-lg">Cancel</button>
                  <button onClick={handleModalSubmit} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg">Delete</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleModalSubmit} className="space-y-4">
                {(modalConfig.type === 'editSystem' || modalConfig.type === 'addSystem') ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Goal Name</label>
                      <input 
                        className="w-full p-4 bg-muted border-0 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-lg text-card-foreground" 
                        placeholder="e.g. Run a Marathon" 
                        value={inputValue} 
                        onChange={(e) => setInputValue(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Your "Why"</label>
                      <input 
                        className="w-full p-4 bg-muted border-0 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground" 
                        placeholder="e.g. To be healthy for my kids" 
                        value={inputWhy} 
                        onChange={(e) => setInputWhy(e.target.value)} 
                      />
                    </div>
                  </>
                ) : modalConfig.type === 'generateSystems' ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground bg-primary/10 p-3 rounded-lg border border-primary/20">
                      <Sparkles size={14} className="inline mr-1 text-primary" />
                      AI will analyze your goal and create a custom list of systems for you.
                    </p>
                  </div>
                ) : (
                  <input 
                    autoFocus 
                    className="w-full p-4 bg-muted border-0 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-lg text-card-foreground placeholder:text-muted-foreground" 
                    placeholder={modalConfig.type === 'setBudget' ? "Enter limit amount" : "Type here..."} 
                    value={inputValue} 
                    onChange={(e) => setInputValue(e.target.value)} 
                    disabled={isGenerating} 
                    type={modalConfig.type === 'setBudget' ? "number" : "text"} 
                  />
                )}
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={closeModal} className="px-5 py-2.5 text-muted-foreground hover:bg-muted rounded-xl font-bold transition-colors">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isGenerating} 
                    className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 font-bold shadow-soft flex items-center gap-2 transition-all active:scale-95"
                  >
                    {isGenerating && <Loader2 className="animate-spin" size={18} />}
                    {isGenerating ? "Thinking..." : "Save"}
                  </button>
                </div>
              </form>
            )
          )}
        </Modal>
      </div>
    </TooltipProvider>
  );
}
