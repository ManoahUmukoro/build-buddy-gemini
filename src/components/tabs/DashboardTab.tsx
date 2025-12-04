import { Plus, Sparkles, ListOrdered, Loader2, Trash2, Edit2, Timer, Wand2, PenTool, X, Cpu, RefreshCw } from 'lucide-react';
import { DAYS } from '@/lib/constants';
import { Tasks, Task } from '@/lib/types';
import { formatCurrency, formatTimer } from '@/lib/formatters';

interface DashboardTabProps {
  tasks: Tasks;
  setTasks: React.Dispatch<React.SetStateAction<Tasks>>;
  completedHabits: number;
  totalHabits: number;
  balance: number;
  currency: string;
  dailyBriefing: string;
  pomodoroActive: boolean;
  pomodoroTime: number;
  setPomodoroActive: (active: boolean) => void;
  setPomodoroTime: (time: number) => void;
  sortingDay: string | null;
  breakingDownTask: number | null;
  onSmartSort: (day: string) => void;
  onBreakdownTask: (day: string, taskId: number, taskText: string) => void;
  onSmartDraft: (taskText: string) => void;
  onLifeAudit: () => void;
  onDailyBriefing: () => void;
  onOpenModal: (type: string, data?: any, initialValue?: string) => void;
}

export function DashboardTab({
  tasks,
  setTasks,
  completedHabits,
  totalHabits,
  balance,
  currency,
  dailyBriefing,
  pomodoroActive,
  pomodoroTime,
  setPomodoroActive,
  setPomodoroTime,
  sortingDay,
  breakingDownTask,
  onSmartSort,
  onBreakdownTask,
  onSmartDraft,
  onLifeAudit,
  onDailyBriefing,
  onOpenModal,
}: DashboardTabProps) {
  const toggleTaskDone = (day: string, taskId: number) => {
    setTasks(prev => ({
      ...prev,
      [day]: prev[day]?.map(t => t.id === taskId ? { ...t, done: !t.done } : t) || []
    }));
  };

  const deleteTask = (day: string, taskId: number) => {
    setTasks(prev => ({
      ...prev,
      [day]: prev[day]?.filter(t => t.id !== taskId) || []
    }));
  };

  const startPomodoro = (taskText: string) => {
    setPomodoroActive(true);
    setPomodoroTime(25 * 60);
    alert(`Focus Mode Started: 25 mins on "${taskText}"`);
  };

  return (
    <div className="space-y-6">
      {/* Command Center Snapshot */}
      <div className="bg-card p-6 rounded-2xl shadow-soft border border-border grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Today's Systems</span>
          <div className="text-2xl font-bold text-card-foreground mt-1">
            {completedHabits} / {totalHabits} <span className="text-sm font-normal text-muted-foreground">Done</span>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Net Balance</span>
          <div className={`text-2xl font-bold mt-1 ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(balance, currency)}
          </div>
        </div>
        <div className="flex flex-col md:col-span-2 relative">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Daily Briefing</span>
          <div className="text-sm font-medium text-muted-foreground mt-1 italic pr-6">{dailyBriefing}</div>
          <button onClick={onDailyBriefing} className="absolute right-0 top-0 text-muted-foreground/50 hover:text-primary">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20 md:pb-0">
        {DAYS.map(day => (
          <div key={day} className="bg-card p-4 rounded-xl shadow-soft border border-border flex flex-col h-64 hover:shadow-card transition-shadow">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-card-foreground">{day}</h3>
              <div className="flex gap-1">
                <button 
                  onClick={() => onSmartSort(day)} 
                  className="bg-success/10 text-success hover:bg-success/20 p-2 rounded-full transition-colors" 
                  title="Smart Sort"
                >
                  {sortingDay === day ? <Loader2 className="animate-spin" size={16} /> : <ListOrdered size={16} />}
                </button>
                <button 
                  onClick={() => onOpenModal('generateSchedule', day)} 
                  className="bg-primary/10 text-primary hover:bg-primary/20 p-2 rounded-full transition-colors"
                >
                  <Sparkles size={16} />
                </button>
                <button 
                  onClick={() => onOpenModal('addTask', day)} 
                  className="bg-primary/10 text-primary hover:bg-primary/20 p-2 rounded-full transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {(tasks[day] || []).map((task, idx) => (
                <TaskItem 
                  key={`${task.id}-${idx}`} 
                  task={task} 
                  day={day}
                  breakingDownTask={breakingDownTask}
                  onToggle={() => toggleTaskDone(day, task.id)}
                  onDelete={() => deleteTask(day, task.id)}
                  onEdit={() => onOpenModal('editTask', { day, taskId: task.id }, task.text)}
                  onBreakdown={() => onBreakdownTask(day, task.id, task.text)}
                  onSmartDraft={() => onSmartDraft(task.text)}
                  onStartPomodoro={() => startPomodoro(task.text)}
                />
              ))}
            </div>
          </div>
        ))}
        
        {/* Brain Dump */}
        <div className="bg-warning/10 p-4 rounded-xl shadow-soft border border-warning/20 flex flex-col h-64">
          <h3 className="font-bold text-warning flex items-center gap-2 mb-3">
            🧠 Brain Dump
            <button onClick={() => onOpenModal('addTask', 'BrainDump')} className="bg-warning/20 p-1 rounded-full">
              <Plus size={16} />
            </button>
          </h3>
          <div className="overflow-y-auto flex-1 space-y-2">
            {(tasks['BrainDump'] || []).map((t, idx) => (
              <div key={`${t.id}-${idx}`} className="bg-card/50 p-2 rounded flex items-center">
                <span className="text-sm flex-1">{t.text}</span>
                <button 
                  onClick={() => setTasks(prev => ({ ...prev, 'BrainDump': prev['BrainDump']?.filter(x => x.id !== t.id) || [] }))} 
                  className="text-muted-foreground"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Life Audit & Pomodoro */}
        <div className="flex flex-col justify-end">
          {pomodoroActive && (
            <div className="bg-warning/10 text-warning p-4 rounded-xl mb-4 flex items-center justify-between border border-warning/20 animate-in">
              <div className="flex items-center gap-3">
                <Timer className="animate-pulse" />
                <span className="font-bold text-xl font-mono">{formatTimer(pomodoroTime)}</span>
              </div>
              <button onClick={() => setPomodoroActive(false)} className="p-2 hover:bg-warning/20 rounded-full">
                <X size={16} />
              </button>
            </div>
          )}

          <button 
            onClick={onLifeAudit} 
            className="w-full bg-primary/10 text-primary rounded-xl p-4 hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 text-sm font-bold border border-primary/20 shadow-soft"
          >
            <Cpu size={20} /> Run Life Audit (AI)
          </button>
        </div>
      </div>
    </div>
  );
}

interface TaskItemProps {
  task: Task;
  day: string;
  breakingDownTask: number | null;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onBreakdown: () => void;
  onSmartDraft: () => void;
  onStartPomodoro: () => void;
}

function TaskItem({ task, day, breakingDownTask, onToggle, onDelete, onEdit, onBreakdown, onSmartDraft, onStartPomodoro }: TaskItemProps) {
  const isSubtask = task.text.startsWith('↳');
  const showDraftButton = ['email', 'message', 'write', 'contact'].some(keyword => 
    task.text.toLowerCase().includes(keyword)
  );

  return (
    <div className="flex items-start group bg-muted p-2 rounded-lg relative">
      <input 
        type="checkbox" 
        checked={task.done} 
        onChange={onToggle} 
        className="mt-1 mr-2 cursor-pointer w-4 h-4 accent-primary"
      />
      <span className={`text-sm flex-1 break-words ${task.done ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
        {task.text}
      </span>
      
      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-muted pl-2 items-center bg-opacity-90 rounded-lg backdrop-blur-sm">
        {!isSubtask && (
          <>
            {showDraftButton && (
              <button onClick={onSmartDraft} className="text-primary hover:text-primary/80 mr-1 p-1" title="Smart Draft">
                <PenTool size={12} />
              </button>
            )}
            <button 
              onClick={onBreakdown} 
              className="text-primary/70 hover:text-primary mr-1 p-1" 
              disabled={breakingDownTask === task.id} 
              title="AI Breakdown"
            >
              {breakingDownTask === task.id ? <Loader2 className="animate-spin" size={12} /> : <Wand2 size={12} />}
            </button>
          </>
        )}
        <button onClick={onStartPomodoro} className="text-warning hover:text-warning/80 mr-1 p-1" title="Start Focus Timer">
          <Timer size={12} />
        </button>
        <button onClick={onEdit} className="text-muted-foreground hover:text-primary mr-1 p-1">
          <Edit2 size={12} />
        </button>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
