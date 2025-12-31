import { useState } from 'react';
import { Plus, Sparkles, ListOrdered, Loader2, Trash2, Edit2, PenTool, Cpu, RefreshCw, ChevronLeft, ChevronRight, Download, Calendar, Clock } from 'lucide-react';
import { DAYS } from '@/lib/constants';
import { Tasks, Task } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { IdeaDump } from '@/components/IdeaDump';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay } from 'date-fns';

interface DashboardTabProps {
  tasks: Tasks;
  setTasks: React.Dispatch<React.SetStateAction<Tasks>>;
  completedHabits: number;
  totalHabits: number;
  balance: number;
  currency: string;
  dailyBriefing: string;
  sortingDay: string | null;
  breakingDownTask: string | number | null;
  onSmartSort: (day: string) => void;
  onBreakdownTask: (day: string, taskId: string | number, taskText: string) => void;
  onSmartDraft: (taskText: string) => void;
  onLifeAudit: () => void;
  onDailyBriefing: () => void;
  onOpenModal: (type: string, data?: any, initialValue?: string) => void;
}

// Get week dates for display
function getWeekDates(baseDate: Date) {
  const monday = startOfWeek(baseDate, { weekStartsOn: 1 });
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(monday, i));
  }
  return dates;
}

function getWeekLabel(baseDate: Date): string {
  const today = new Date();
  const thisMonday = startOfWeek(today, { weekStartsOn: 1 });
  const targetMonday = startOfWeek(baseDate, { weekStartsOn: 1 });
  
  if (isSameDay(thisMonday, targetMonday)) return 'This Week';
  
  const lastMonday = subWeeks(thisMonday, 1);
  if (isSameDay(lastMonday, targetMonday)) return 'Last Week';
  
  const nextMonday = addWeeks(thisMonday, 1);
  if (isSameDay(nextMonday, targetMonday)) return 'Next Week';
  
  return `${format(targetMonday, 'MMM d')} - ${format(addDays(targetMonday, 6), 'MMM d')}`;
}

// Get exact date range label for downloads (always show exact dates)
function getExactWeekLabel(baseDate: Date): string {
  const monday = startOfWeek(baseDate, { weekStartsOn: 1 });
  const sunday = addDays(monday, 6);
  return `${format(monday, 'MMM d, yyyy')} - ${format(sunday, 'MMM d, yyyy')}`;
}

export function DashboardTab({
  tasks,
  setTasks,
  completedHabits,
  totalHabits,
  balance,
  currency,
  dailyBriefing,
  sortingDay,
  breakingDownTask,
  onSmartSort,
  onBreakdownTask,
  onSmartDraft,
  onLifeAudit,
  onDailyBriefing,
  onOpenModal,
}: DashboardTabProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const weekDates = getWeekDates(selectedDate);
  const isCurrentWeek = isSameDay(startOfWeek(new Date(), { weekStartsOn: 1 }), startOfWeek(selectedDate, { weekStartsOn: 1 }));
  const isPastWeek = startOfWeek(selectedDate, { weekStartsOn: 1 }) < startOfWeek(new Date(), { weekStartsOn: 1 });

  const toggleTaskDone = (day: string, taskId: string | number) => {
    setTasks(prev => ({
      ...prev,
      [day]: prev[day]?.map(t => String(t.id) === String(taskId) ? { ...t, done: !t.done } : t) || []
    }));
  };

  const deleteTask = (day: string, taskId: string | number) => {
    setTasks(prev => ({
      ...prev,
      [day]: prev[day]?.filter(t => String(t.id) !== String(taskId)) || []
    }));
  };

  const getTasksForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    // Check if we have tasks stored by date
    if (tasks[dateKey]) return tasks[dateKey];
    // Fallback to day name for current week
    if (isCurrentWeek) {
      const dayName = DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
      return tasks[dayName] || [];
    }
    return tasks[dateKey] || [];
  };

  const getTaskKey = (date: Date) => {
    if (isCurrentWeek) {
      return DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
    }
    return format(date, 'yyyy-MM-dd');
  };

  const calculateWeeklyStats = () => {
    let completed = 0;
    let total = 0;
    
    weekDates.forEach(date => {
      const dayTasks = getTasksForDate(date);
      dayTasks.forEach(task => {
        total++;
        if (task.done) completed++;
      });
    });
    
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const downloadWeeklySummary = async () => {
    const stats = calculateWeeklyStats();
    const exactDateRange = getExactWeekLabel(selectedDate);
    
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      toast.error('Failed to generate summary');
      return;
    }

    // OLED Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 800, 500);

    // Gradient overlay for depth
    const gradient = ctx.createLinearGradient(0, 0, 800, 500);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.05)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 500);

    // Border
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2;
    ctx.roundRect(10, 10, 780, 480, 15);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📊 Weekly Productivity Summary', 400, 50);

    // Exact date range (always show exact dates)
    ctx.fillStyle = '#22C55E';
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.fillText(exactDateRange, 400, 80);

    // Stats
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${stats.percentage}%`, 400, 170);

    ctx.fillStyle = '#22C55E';
    ctx.font = '18px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${stats.completed} of ${stats.total} tasks completed`, 400, 205);

    // Day breakdown
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const startX = 100;
    const spacing = 100;
    
    dayLabels.forEach((day, i) => {
      const x = startX + i * spacing;
      const y = 320;
      const date = weekDates[i];
      const dayTasks = getTasksForDate(date);
      const completed = dayTasks.filter(t => t.done).length;
      const total = dayTasks.length;
      const pct = total > 0 ? completed / total : 0;
      
      // Bar background
      ctx.fillStyle = '#1C1C1E';
      ctx.beginPath();
      ctx.roundRect(x - 20, y - 80, 40, 100, 8);
      ctx.fill();
      
      // Bar fill
      const fillHeight = pct * 80;
      ctx.fillStyle = pct === 1 ? '#22C55E' : pct > 0.5 ? '#F59E0B' : pct > 0 ? '#EF4444' : '#374151';
      if (fillHeight > 0) {
        ctx.beginPath();
        ctx.roundRect(x - 18, y - fillHeight + 18, 36, fillHeight, 6);
        ctx.fill();
      }
      
      // Day label
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(day, x, y + 25);
      
      // Date
      ctx.fillStyle = '#6B7280';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText(format(date, 'M/d'), x, y + 40);
      
      // Count
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${completed}/${total}`, x, y + 58);
    });

    // Focus time placeholder
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Focus Sessions: Coming Soon', 400, 420);

    // Branding
    ctx.fillStyle = '#4B5563';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('LifeOS', 770, 475);

    // Download
    const link = document.createElement('a');
    const monday = startOfWeek(selectedDate, { weekStartsOn: 1 });
    link.download = `weekly_summary_${format(monday, 'yyyy-MM-dd')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    toast.success('Weekly summary downloaded!');
  };

  // Idea Dump handlers
  const handleAddIdea = (text: string) => {
    setTasks(prev => ({
      ...prev,
      'IdeaDump': [...(prev['IdeaDump'] || []), { id: Date.now(), text, done: false }]
    }));
  };

  const handleDeleteIdea = (id: string | number) => {
    setTasks(prev => ({
      ...prev,
      'IdeaDump': prev['IdeaDump']?.filter(x => String(x.id) !== String(id)) || []
    }));
  };

  return (
    <div className="space-y-6">
      {/* Command Center Snapshot */}
      <div className="bg-card p-4 md:p-6 rounded-2xl shadow-soft grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="flex flex-col p-2 md:p-0">
          <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider font-bold">Today's Systems</span>
          <div className="text-lg md:text-2xl font-bold text-card-foreground mt-0.5 md:mt-1">
            {completedHabits} / {totalHabits} <span className="text-xs md:text-sm font-normal text-muted-foreground">Done</span>
          </div>
        </div>
        <div className="flex flex-col p-2 md:p-0">
          <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider font-bold">Net Balance</span>
          <div className={`text-lg md:text-2xl font-bold mt-0.5 md:mt-1 ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(balance, currency)}
          </div>
        </div>
        <div className="flex flex-col sm:col-span-2 relative p-2 md:p-0">
          <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider font-bold">Daily Briefing</span>
          <div className="text-xs md:text-sm font-medium text-muted-foreground mt-0.5 md:mt-1 italic pr-6 line-clamp-2 md:line-clamp-none">{dailyBriefing}</div>
          <button onClick={onDailyBriefing} className="absolute right-2 md:right-0 top-2 md:top-0 text-muted-foreground/50 hover:text-primary">
            <RefreshCw size={12} className="md:w-[14px] md:h-[14px]" />
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between gap-2 bg-card p-3 rounded-xl shadow-soft">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(prev => subWeeks(prev, 1))}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft size={18} />
          </Button>
          <span className="text-sm font-medium text-card-foreground min-w-[120px] text-center">
            {getWeekLabel(selectedDate)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(prev => addWeeks(prev, 1))}
            disabled={!isPastWeek && isCurrentWeek}
            className="h-8 w-8 p-0"
          >
            <ChevronRight size={18} />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Calendar size={14} />
                <span className="hidden sm:inline text-xs">Pick Date</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {!isCurrentWeek && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="text-xs h-8"
            >
              Today
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={downloadWeeklySummary}
            className="h-8 gap-1"
            title="Download Weekly Summary"
          >
            <Download size={14} />
            <span className="hidden sm:inline text-xs">Export</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20 md:pb-0">
        {weekDates.map((date, idx) => {
          const dayName = DAYS[idx];
          const taskKey = getTaskKey(date);
          const dayTasks = getTasksForDate(date);
          const isToday = isSameDay(date, new Date());
          
          return (
            <div 
              key={dayName} 
              className={`bg-card p-4 rounded-xl shadow-soft flex flex-col h-64 hover:shadow-card transition-shadow ${isToday ? 'ring-2 ring-primary/30' : ''}`}
            >
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="font-bold text-card-foreground">{dayName}</h3>
                  <span className="text-[10px] text-muted-foreground">{format(date, 'MMM d')}</span>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => onSmartSort(taskKey)} 
                    className="bg-success/10 text-success hover:bg-success/20 p-2 rounded-full transition-colors" 
                    title="Smart Sort"
                    disabled={isPastWeek && !isCurrentWeek}
                  >
                    {sortingDay === taskKey ? <Loader2 className="animate-spin" size={16} /> : <ListOrdered size={16} />}
                  </button>
                  <button 
                    onClick={() => onOpenModal('generateSchedule', taskKey)} 
                    className="bg-primary/10 text-primary hover:bg-primary/20 p-2 rounded-full transition-colors"
                    disabled={isPastWeek && !isCurrentWeek}
                    title="Daily Plan Assistant"
                  >
                    <Sparkles size={16} />
                  </button>
                  <button 
                    onClick={() => onOpenModal('addTask', taskKey)} 
                    className="bg-primary/10 text-primary hover:bg-primary/20 p-2 rounded-full transition-colors"
                    title="Add Task"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                {dayTasks.map((task, taskIdx) => (
                  <TaskItem 
                    key={`${task.id}-${taskIdx}`} 
                    task={task} 
                    day={taskKey}
                    onToggle={() => toggleTaskDone(taskKey, task.id)}
                    onDelete={() => deleteTask(taskKey, task.id)}
                    onEdit={() => onOpenModal('editTask', { day: taskKey, taskId: task.id }, task.text)}
                    onSmartDraft={() => onSmartDraft(task.text)}
                  />
                ))}
              </div>
            </div>
          );
        })}
        
        {/* Idea Dump (formerly Brain Dump) */}
        <IdeaDump 
          ideas={tasks['IdeaDump'] || tasks['BrainDump'] || []}
          onAddIdea={handleAddIdea}
          onDeleteIdea={handleDeleteIdea}
        />

        {/* Life Audit */}
        <div className="flex flex-col justify-end">
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
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSmartDraft: () => void;
}

function TaskItem({ task, day, onToggle, onDelete, onEdit, onSmartDraft }: TaskItemProps) {
  const taskText = task.text || '';
  const isSubtask = taskText.startsWith('↳');
  const showDraftButton = ['email', 'message', 'write', 'contact'].some(keyword => 
    taskText.toLowerCase().includes(keyword)
  );

  return (
    <div className="flex items-start group bg-muted p-2 rounded-lg relative">
      <input 
        type="checkbox" 
        checked={task.done} 
        onChange={onToggle} 
        className="mt-1 mr-2 cursor-pointer w-4 h-4 accent-primary"
      />
      <div className="flex-1 min-w-0">
        <span className={`text-sm break-words ${task.done ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
          {taskText}
        </span>
        {task.time && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
            <Clock size={10} />
            <span>{task.time}</span>
          </div>
        )}
      </div>
      
      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-muted pl-2 items-center bg-opacity-90 rounded-lg backdrop-blur-sm">
        {!isSubtask && showDraftButton && (
          <button onClick={onSmartDraft} className="text-primary hover:text-primary/80 mr-1 p-1" title="Smart Draft">
            <PenTool size={12} />
          </button>
        )}
        <button onClick={onEdit} className="text-muted-foreground hover:text-primary mr-1 p-1" title="Edit">
          <Edit2 size={12} />
        </button>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1" title="Delete">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
