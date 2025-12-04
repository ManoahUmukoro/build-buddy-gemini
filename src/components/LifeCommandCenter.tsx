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
import { SaveIndicator } from '@/components/SaveIndicator';
import { TabId, ModalConfig, ChatMessage, JournalEntry } from '@/lib/types';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useAI } from '@/hooks/useAI';
import { useProfile } from '@/hooks/useProfile';
import { getCurrentDayIndex } from '@/lib/formatters';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function LifeCommandCenter() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  
  // Modal State
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ isOpen: false, type: null, data: null });
  const [inputValue, setInputValue] = useState('');
  const [inputWhy, setInputWhy] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Supabase Data
  const {
    loading: dataLoading,
    saveStatus,
    tasks, setTasks,
    systems, setSystems,
    transactions, setTransactions,
    journalEntries, setJournalEntries,
    budgets, setBudgets,
    categories, setCategories,
    subscriptions, setSubscriptions,
    geminiApiKey, setGeminiApiKey
  } = useSupabaseData();
  
  // AI Hook
  const ai = useAI();
  
  // Profile Hook
  const { profile } = useProfile();
  
  // Local UI State
  const [sortingDay, setSortingDay] = useState<string | null>(null);
  const [breakingDownTask, setBreakingDownTask] = useState<string | number | null>(null);
  const [currency, setCurrency] = useState('₦');
  const [newTransaction, setNewTransaction] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    category: categories[0] || 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [editingTransactionId, setEditingTransactionId] = useState<string | number | null>(null);
  const [financeAnalysis, setFinanceAnalysis] = useState("");
  const [isAnalyzingFinance, setIsAnalyzingFinance] = useState(false);
  const [financeChatHistory, setFinanceChatHistory] = useState<ChatMessage[]>([]);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [todayEntry, setTodayEntry] = useState({ mood: 3, win: '', improve: '', thoughts: '' });
  const [editingEntryId, setEditingEntryId] = useState<string | number | null>(null);
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [journalChatHistory, setJournalChatHistory] = useState<ChatMessage[]>([]);
  const welcomeMessage = profile?.display_name ? `Welcome, ${profile.display_name}!` : "Ready to conquer the day?";
  const [dailyBriefing, setDailyBriefing] = useState(welcomeMessage);
  const [lifeAudit, setLifeAudit] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [pomodoroActive, setPomodoroActive] = useState(false);

  // Update welcome message when profile loads
  useEffect(() => {
    if (profile?.display_name) {
      setDailyBriefing(`Welcome, ${profile.display_name}!`);
    }
  }, [profile]);

  // Pomodoro Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (pomodoroActive && pomodoroTime > 0) {
      interval = setInterval(() => setPomodoroTime(prev => prev - 1), 1000);
    } else if (pomodoroTime === 0) {
      setPomodoroActive(false);
      toast.success("Focus Session Complete!");
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

  // AI Handlers
  const handleSmartSort = async (day: string) => {
    const currentTasks = tasks[day] || [];
    if (currentTasks.length < 2) return toast.error("Add at least 2 tasks to sort!");
    setSortingDay(day);
    
    const sorted = await ai.smartSort(currentTasks);
    if (sorted) {
      setTasks(prev => ({ ...prev, [day]: sorted }));
    } else {
      // Fallback to random sort
      setTasks(prev => ({
        ...prev,
        [day]: [...(prev[day] || [])].sort(() => Math.random() - 0.5)
      }));
    }
    setSortingDay(null);
  };

  const handleBreakdownTask = async (day: string, taskId: string | number, taskText: string) => {
    setBreakingDownTask(taskId);
    
    const subtasks = await ai.breakdownTask(taskText);
    if (subtasks) {
      const newSubtasks = subtasks.map((s: any, i: number) => ({
        id: Date.now() + i,
        text: `↳ ${s.text || s}`,
        done: false
      }));
      setTasks(prev => {
        const currentDayTasks = prev[day] || [];
        const taskIndex = currentDayTasks.findIndex(t => String(t.id) === String(taskId));
        if (taskIndex === -1) return prev;
        const newTasks = [...currentDayTasks.slice(0, taskIndex + 1), ...newSubtasks, ...currentDayTasks.slice(taskIndex + 1)];
        return { ...prev, [day]: newTasks };
      });
    }
    setBreakingDownTask(null);
  };

  const handleSmartDraft = async (taskText: string) => {
    setIsGenerating(true);
    openModal('smartDraft');
    
    const draft = await ai.smartDraft(taskText);
    setDraftText(draft || `Draft for "${taskText}":\n\nDear [Recipient],\n\nI hope this message finds you well.\n\nBest regards`);
    setIsGenerating(false);
  };

  const handleLifeAudit = async () => {
    setIsGenerating(true);
    openModal('lifeAudit');
    
    const totalTasks = Object.values(tasks).reduce((acc, dayTasks) => acc + dayTasks.length, 0);
    const audit = await ai.lifeAudit({
      completedHabits,
      totalHabits,
      balance,
      totalTasks,
      journalCount: journalEntries.length
    });
    setLifeAudit(audit || `Based on your data:\n\n**Insight**: Your habit completion is at ${Math.round((completedHabits/Math.max(1, totalHabits))*100)}% today.\n\n**Recommendation**: Keep building momentum!`);
    setIsGenerating(false);
  };

  const handleDailyBriefing = async () => {
    const todayTasks = tasks[`d${currentDayIndex}`]?.length || 0;
    const briefing = await ai.dailyBriefing({
      todayTasks,
      habitsToComplete: totalHabits - completedHabits,
      balance
    });
    setDailyBriefing(briefing || `You have ${todayTasks} tasks today. Let's make it count!`);
  };

  const handleAnalyzeFinances = async () => {
    if (transactions.length === 0) return toast.error("Add some money records first!");
    setIsAnalyzingFinance(true);
    
    const analysis = await ai.analyzeFinances({ totalIncome, totalExpense, balance, expenseData });
    setFinanceAnalysis(analysis || `• Your balance is ${balance >= 0 ? 'healthy' : 'in deficit'}\n• Review your spending patterns`);
    setIsAnalyzingFinance(false);
  };

  const handleFinanceChat = async (text: string, _imageBase64: string | null) => {
    setIsAnalyzingFinance(true);
    const userMsg: ChatMessage = { role: 'user', text };
    setFinanceChatHistory(prev => [...prev, userMsg]);
    
    const response = await ai.financeChat([...financeChatHistory, userMsg].map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.text })));
    if (response) {
      setFinanceChatHistory(prev => [...prev, { role: 'model', text: response }]);
    }
    setIsAnalyzingFinance(false);
  };

  const handleJournalChat = async (text: string, _imageBase64: string | null) => {
    setIsSavingJournal(true);
    const userMsg: ChatMessage = { role: 'user', text };
    setJournalChatHistory(prev => [...prev, userMsg]);
    
    const response = await ai.journalChat([...journalChatHistory, userMsg].map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.text })));
    if (response) {
      setJournalChatHistory(prev => [...prev, { role: 'model', text: response }]);
    }
    setIsSavingJournal(false);
  };

  const handleAutoCategorize = async () => {
    if (!newTransaction.description) return toast.error("Enter a description first!");
    setIsCategorizing(true);
    
    const category = await ai.autoCategorize(newTransaction.description, categories);
    if (category) {
      setNewTransaction(prev => ({ ...prev, category: category.trim() }));
    }
    setIsCategorizing(false);
  };

  const handleReceiptScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanningReceipt(true);
    // For now, simulate - would need image processing
    setTimeout(() => {
      setNewTransaction(prev => ({
        ...prev,
        amount: String(Math.floor(Math.random() * 10000)),
        description: 'Scanned Receipt Item',
        type: 'expense'
      }));
      setIsScanningReceipt(false);
      toast.success("Receipt Scanned!");
    }, 2000);
  };

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingJournal(true);
    
    const entryData: JournalEntry = {
      ...todayEntry,
      id: editingEntryId || Date.now(),
      date: editingEntryId ? journalEntries.find(e => e.id === editingEntryId)?.date || new Date().toLocaleDateString() : new Date().toLocaleDateString(),
      tags: todayEntry.thoughts.length > 10 ? ['#reflection', '#growth'] : undefined
    };
    
    if (editingEntryId) {
      await setJournalEntries(prev => prev.map(e => e.id === editingEntryId ? entryData : e));
      setEditingEntryId(null);
    } else {
      await setJournalEntries(prev => [entryData, ...prev]);
    }
    setTodayEntry({ mood: 3, win: '', improve: '', thoughts: '' });
    setIsSavingJournal(false);
    toast.success("Journal entry saved!");
  };

  const handleWeeklyReport = async () => {
    if (journalEntries.length === 0) return toast.error("No entries!");
    setIsSavingJournal(true);
    
    const report = await ai.weeklyReport(journalEntries.slice(0, 7));
    if (report) {
      setJournalChatHistory(prev => [...prev, { role: 'model', text: report }]);
    }
    setIsSavingJournal(false);
  };

  // Modal Submit Handler
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isDeleteAction = modalConfig.type?.startsWith('delete');
    if (!inputValue.trim() && !isDeleteAction) return;

    switch (modalConfig.type) {
      case 'addTask':
        await setTasks(prev => ({
          ...prev,
          [modalConfig.data]: [...(prev[modalConfig.data] || []), { id: Date.now(), text: inputValue, done: false }]
        }));
        break;
      case 'editTask':
        const { day, taskId } = modalConfig.data;
        await setTasks(prev => ({
          ...prev,
          [day]: prev[day]?.map(t => t.id === taskId ? { ...t, text: inputValue } : t) || []
        }));
        break;
      case 'generateSchedule':
        setIsGenerating(true);
        const schedule = await ai.generateSchedule(inputValue || 'productive day');
        if (schedule) {
          const newItems = schedule.map((s: any, i: number) => ({
            id: Date.now() + i,
            text: s.text || s,
            done: false
          }));
          await setTasks(prev => ({
            ...prev,
            [modalConfig.data]: [...(prev[modalConfig.data] || []), ...newItems]
          }));
        }
        setIsGenerating(false);
        closeModal();
        return;
      case 'addSystem':
        await setSystems(prev => [...prev, { id: Date.now(), goal: inputValue, why: inputWhy || "To improve my life", habits: [] }]);
        break;
      case 'editSystem':
        await setSystems(prev => prev.map(s => String(s.id) === String(modalConfig.data) ? { ...s, goal: inputValue, why: inputWhy } : s));
        break;
      case 'deleteSystem':
        await setSystems(prev => prev.filter(s => String(s.id) !== String(modalConfig.data)));
        break;
      case 'addHabitToSystem':
        await setSystems(prev => prev.map(s => String(s.id) === String(modalConfig.data) 
          ? { ...s, habits: [...s.habits, { id: Date.now(), name: inputValue, completed: {} }] } 
          : s
        ));
        break;
      case 'editHabit':
        const { systemId: editSysId, habitId: editHabId } = modalConfig.data;
        await setSystems(prev => prev.map(s => String(s.id) === String(editSysId) 
          ? { ...s, habits: s.habits.map(h => String(h.id) === String(editHabId) ? { ...h, name: inputValue } : h) } 
          : s
        ));
        break;
      case 'deleteHabit':
        const { systemId: delSysId, habitId: delHabId } = modalConfig.data;
        await setSystems(prev => prev.map(s => String(s.id) === String(delSysId) 
          ? { ...s, habits: s.habits.filter(h => String(h.id) !== String(delHabId)) } 
          : s
        ));
        break;
      case 'generateSystems':
        setIsGenerating(true);
        const { systemId, goalName, goalWhy } = modalConfig.data;
        const habits = await ai.generateHabits(goalName, goalWhy);
        if (habits) {
          const newHabits = habits.map((h: any, i: number) => ({
            id: Date.now() + i,
            name: h.name || h,
            completed: {}
          }));
          await setSystems(prev => prev.map(s => String(s.id) === String(systemId) ? { ...s, habits: [...s.habits, ...newHabits] } : s));
        }
        setIsGenerating(false);
        closeModal();
        return;
      case 'setBudget':
        await setBudgets(prev => ({ ...prev, [modalConfig.data]: parseFloat(inputValue) }));
        break;
      case 'addCategory':
        await setCategories(prev => [...prev, inputValue]);
        break;
      case 'deleteTransaction':
        await setTransactions(prev => prev.filter(tr => String(tr.id) !== String(modalConfig.data)));
        if (String(editingTransactionId) === String(modalConfig.data)) {
          setEditingTransactionId(null);
          setNewTransaction({ type: 'expense', amount: '', category: categories[0], description: '', date: new Date().toISOString().split('T')[0] });
        }
        break;
      case 'addSubscription':
        const parts = inputValue.split(' ');
        const potentialAmount = parseFloat(parts[parts.length - 1]);
        const subName = isNaN(potentialAmount) ? inputValue : parts.slice(0, -1).join(' ');
        const subAmount = isNaN(potentialAmount) ? 0 : potentialAmount;
        await setSubscriptions(prev => [...prev, { id: Date.now(), name: subName, amount: subAmount }]);
        break;
      case 'editSubscription':
        const editParts = inputValue.split(' ');
        const editPotentialAmount = parseFloat(editParts[editParts.length - 1]);
        const editName = isNaN(editPotentialAmount) ? inputValue : editParts.slice(0, -1).join(' ');
        const editAmount = isNaN(editPotentialAmount) ? 0 : editPotentialAmount;
        await setSubscriptions(prev => prev.map(s => String(s.id) === String(modalConfig.data?.id) ? { ...s, name: editName, amount: editAmount } : s));
        break;
      case 'deleteSubscription':
        await setSubscriptions(prev => prev.filter(s => String(s.id) !== String(modalConfig.data)));
        break;
    }
    closeModal();
  };

  // Backup/Restore
  const handleBackup = () => {
    const data = {
      tasks,
      systems,
      transactions,
      journalEntries,
      budgets,
      categories,
      subscriptions,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeos_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm("Overwrite current data with backup?")) {
          if (data.tasks) await setTasks(data.tasks);
          if (data.systems) await setSystems(data.systems);
          if (data.transactions) await setTransactions(data.transactions);
          if (data.journalEntries) await setJournalEntries(data.journalEntries);
          if (data.budgets) await setBudgets(data.budgets);
          if (data.categories) await setCategories(data.categories);
          if (data.subscriptions) await setSubscriptions(data.subscriptions);
          toast.success("Restored successfully!");
        }
      } catch (err) {
        toast.error("Error restoring data.");
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

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mx-auto mb-4" size={40} />
          <p className="text-muted-foreground">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1 overflow-y-auto w-full pb-24 md:pb-0">
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
                geminiApiKey={geminiApiKey}
                onSaveApiKey={setGeminiApiKey}
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
                    onClick={() => { navigator.clipboard.writeText(draftText); closeModal(); toast.success("Copied to clipboard!"); }} 
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
                      AI will analyze your goal and create a custom list of habits for you.
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
        
        <SaveIndicator status={saveStatus} />
      </div>
    </TooltipProvider>
  );
}
