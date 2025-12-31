import { useState } from 'react';
import { Plus, Target, Sparkles, Trash2, Edit2, ChevronLeft, ChevronRight, Download, Info, ChevronDown } from 'lucide-react';
import { System } from '@/lib/types';
import { DAYS } from '@/lib/constants';
import { getCurrentDayIndex } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface SystemsTabProps {
  systems: System[];
  setSystems: React.Dispatch<React.SetStateAction<System[]>>;
  onOpenModal: (type: string, data?: any, initialValue?: string, initialWhy?: string) => void;
}

// Get week dates for a given offset (0 = current week, -1 = last week, etc.)
function getWeekDates(weekOffset: number) {
  const today = new Date();
  const currentDay = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - currentDay + 1 + (weekOffset * 7));
  
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function getWeekLabel(weekOffset: number): string {
  if (weekOffset === 0) return 'This Week';
  if (weekOffset === -1) return 'Last Week';
  if (weekOffset === 1) return 'Next Week';
  
  const dates = getWeekDates(weekOffset);
  const start = new Date(dates[0]);
  const end = new Date(dates[6]);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export function SystemsTab({ systems, setSystems, onOpenModal }: SystemsTabProps) {
  const currentDayIndex = getCurrentDayIndex();
  const [weekOffset, setWeekOffset] = useState(0);
  const [openSystemId, setOpenSystemId] = useState<string | number | null>(
    systems.length > 0 ? systems[0].id : null
  );

  const weekDates = getWeekDates(weekOffset);
  const weekKey = weekDates[0]; // Use monday's date as week key

  const toggleHabit = (systemId: string | number, habitId: string | number, dayIndex: number) => {
    const dateKey = weekDates[dayIndex];
    setSystems(prev => prev.map(s => 
      String(s.id) === String(systemId) 
        ? {
            ...s,
            habits: s.habits.map(h => 
              String(h.id) === String(habitId) 
                ? { ...h, completed: { ...h.completed, [dateKey]: !h.completed[dateKey] } }
                : h
            )
          }
        : s
    ));
  };

  const calculateStreakPercentage = (system: System) => {
    let completed = 0;
    let total = 0;
    
    system.habits.forEach(habit => {
      weekDates.forEach(date => {
        total++;
        if (habit.completed[date]) completed++;
      });
    });
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const downloadStreakCard = async (system: System) => {
    const percentage = calculateStreakPercentage(system);
    
    // Create canvas for streak card
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      toast.error('Failed to generate streak card');
      return;
    }

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 600, 400);
    gradient.addColorStop(0, '#1C1C1E');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.roundRect(0, 0, 600, 400, 20);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.roundRect(10, 10, 580, 380, 15);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎯 ' + system.goal, 300, 60);

    // Week label
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.fillText(getWeekLabel(weekOffset), 300, 90);

    // Percentage circle
    const centerX = 300;
    const centerY = 200;
    const radius = 70;

    // Background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 12;
    ctx.stroke();

    // Progress arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, (-Math.PI / 2) + (2 * Math.PI * percentage / 100));
    ctx.strokeStyle = percentage >= 70 ? '#22C55E' : percentage >= 40 ? '#F59E0B' : '#EF4444';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Percentage text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${percentage}%`, centerX, centerY);

    // Habit checkmarks row
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.textAlign = 'center';
    ctx.fillText('Weekly Progress', 300, 300);

    // Day indicators
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const startX = 150;
    const spacing = 50;
    
    dayLabels.forEach((day, i) => {
      const x = startX + i * spacing;
      const y = 340;
      
      // Count completions for this day across all habits
      const dayDate = weekDates[i];
      const completedCount = system.habits.filter(h => h.completed[dayDate]).length;
      const allCompleted = completedCount === system.habits.length && system.habits.length > 0;
      
      ctx.fillStyle = allCompleted ? '#22C55E' : '#374151';
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = allCompleted ? '#000000' : '#9CA3AF';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(day, x, y + 4);
    });

    // Branding
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('LifeOS', 570, 380);

    // Download
    const link = document.createElement('a');
    link.download = `${system.goal.replace(/[^a-z0-9]/gi, '_')}_streak.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    toast.success('Streak card downloaded!');
  };

  // Download all systems summary
  const downloadAllSystemsSummary = async () => {
    if (systems.length === 0) {
      toast.error('No systems to export');
      return;
    }

    const canvas = document.createElement('canvas');
    const rowHeight = 80;
    const headerHeight = 180;
    const footerHeight = 60;
    canvas.width = 800;
    canvas.height = headerHeight + (systems.length * rowHeight) + footerHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      toast.error('Failed to generate summary');
      return;
    }

    // OLED Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gradient overlay for depth
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.05)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 15);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎯 Systems & Goals Summary', canvas.width / 2, 50);

    // Week label
    ctx.fillStyle = '#3B82F6';
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    const dates = getWeekDates(weekOffset);
    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[6]);
    ctx.fillText(
      `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      canvas.width / 2, 
      80
    );

    // Overall stats
    let totalCompleted = 0;
    let totalPossible = 0;
    systems.forEach(system => {
      system.habits.forEach(habit => {
        weekDates.forEach(date => {
          totalPossible++;
          if (habit.completed[date]) totalCompleted++;
        });
      });
    });
    const overallPercentage = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${overallPercentage}%`, canvas.width / 2, 140);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Overall consistency (${totalCompleted}/${totalPossible} check-ins)`, canvas.width / 2, 165);

    // System rows
    let yOffset = headerHeight;
    systems.forEach((system) => {
      const percentage = calculateStreakPercentage(system);
      
      // Row background
      ctx.fillStyle = '#1C1C1E';
      ctx.beginPath();
      ctx.roundRect(30, yOffset, canvas.width - 60, 65, 10);
      ctx.fill();

      // Goal name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`🎯 ${system.goal}`, 50, yOffset + 28);

      // Why text
      ctx.fillStyle = '#9CA3AF';
      ctx.font = 'italic 12px system-ui, -apple-system, sans-serif';
      const whyText = system.why.length > 50 ? system.why.substring(0, 50) + '...' : system.why;
      ctx.fillText(whyText, 50, yOffset + 48);

      // Percentage badge
      const badgeColor = percentage >= 70 ? '#22C55E' : percentage >= 40 ? '#F59E0B' : '#EF4444';
      ctx.fillStyle = badgeColor;
      ctx.beginPath();
      ctx.roundRect(canvas.width - 120, yOffset + 15, 70, 35, 8);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${percentage}%`, canvas.width - 85, yOffset + 40);

      yOffset += rowHeight;
    });

    // Branding
    ctx.fillStyle = '#4B5563';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('LifeOS', canvas.width - 30, canvas.height - 25);

    // Download
    const link = document.createElement('a');
    link.download = `systems_summary_${dates[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    toast.success('Systems summary downloaded!');
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      {/* Header with Week Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-3 md:p-4 rounded-xl shadow-soft">
        <div className="flex items-start gap-2">
          <div>
            <h3 className="font-bold text-card-foreground text-base md:text-lg flex items-center gap-2">
              Systems & Goals
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-primary transition-colors">
                    <Info size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px]">
                  <p className="text-sm">
                    <strong>Systems</strong> are repeatable actions that help you achieve your goals. 
                    Focus on building consistent systems rather than chasing outcomes.
                  </p>
                </TooltipContent>
              </Tooltip>
            </h3>
            <p className="text-xs text-muted-foreground">Identity-based systems for lasting change.</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadAllSystemsSummary}
            className="h-9 gap-1 flex-1 sm:flex-initial justify-center"
            title="Export All Systems"
          >
            <Download size={14} />
            <span className="text-xs">Export</span>
          </Button>
          <button 
            onClick={() => onOpenModal('addSystem', null, "")}
            className="bg-secondary text-secondary-foreground px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm hover:bg-secondary/80 flex items-center gap-1.5 md:gap-2 transition-colors flex-1 sm:flex-initial justify-center"
          >
            <Target size={14} className="md:w-4 md:h-4" /> New Goal
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-center gap-2 bg-card p-2 rounded-xl shadow-soft">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekOffset(prev => prev - 1)}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft size={18} />
        </Button>
        <span className="text-sm font-medium text-card-foreground min-w-[140px] text-center">
          {getWeekLabel(weekOffset)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekOffset(prev => prev + 1)}
          disabled={weekOffset >= 0}
          className="h-8 w-8 p-0"
        >
          <ChevronRight size={18} />
        </Button>
        {weekOffset !== 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(0)}
            className="text-xs ml-2"
          >
            Today
          </Button>
        )}
      </div>

      {/* Systems Accordion */}
      {systems.map((system, sysIdx) => (
        <Collapsible
          key={`${system.id}-${sysIdx}`}
          open={openSystemId === system.id}
          onOpenChange={(isOpen) => setOpenSystemId(isOpen ? system.id : null)}
        >
          <div className="bg-card rounded-xl shadow-soft overflow-hidden">
            <CollapsibleTrigger asChild>
              <div className="bg-muted p-3 md:p-4 cursor-pointer hover:bg-muted/80 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <ChevronDown 
                      size={20} 
                      className={`text-muted-foreground transition-transform duration-200 flex-shrink-0 ${openSystemId === system.id ? 'rotate-180' : ''}`} 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-card-foreground flex items-center gap-1.5 md:gap-2 text-sm md:text-lg">
                          <Target size={14} className="text-primary md:w-[18px] md:h-[18px] flex-shrink-0" />
                          <span className="break-words">{system.goal}</span>
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          calculateStreakPercentage(system) >= 70 
                            ? 'bg-success/20 text-success' 
                            : calculateStreakPercentage(system) >= 40 
                              ? 'bg-warning/20 text-warning' 
                              : 'bg-muted-foreground/20 text-muted-foreground'
                        }`}>
                          {calculateStreakPercentage(system)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">{system.why}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 md:gap-2 flex-wrap w-full sm:w-auto" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => downloadStreakCard(system)} 
                      className="text-muted-foreground hover:bg-primary/10 hover:text-primary px-2 md:px-3 py-1 rounded text-xs md:text-sm font-bold border border-border flex items-center gap-1 flex-1 sm:flex-initial justify-center"
                      title="Download Streak Card"
                    >
                      <Download size={12} className="md:w-[14px] md:h-[14px]" />
                    </button>
                    <button 
                      onClick={() => onOpenModal('editSystem', system.id, system.goal, system.why)} 
                      className="bg-primary/10 text-primary hover:bg-primary/20 p-1 md:p-1.5 rounded-md transition-colors flex-shrink-0" 
                      title="Edit Goal"
                    >
                      <Edit2 size={12} className="md:w-[14px] md:h-[14px]" />
                    </button>
                    <button 
                      onClick={() => onOpenModal('generateSystems', { systemId: system.id, goalName: system.goal, goalWhy: system.why })} 
                      className="text-primary hover:bg-primary/10 px-2 md:px-3 py-1 rounded text-xs md:text-sm font-bold border border-primary/20 flex items-center gap-1 flex-1 sm:flex-initial justify-center"
                    >
                      <Sparkles size={12} className="md:w-[14px] md:h-[14px]" /> AI
                    </button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          onClick={() => onOpenModal('addHabitToSystem', system.id)} 
                          className="text-primary hover:bg-primary/10 px-2 md:px-3 py-1 rounded text-xs md:text-sm font-bold border border-primary/20 flex items-center gap-1 flex-1 sm:flex-initial justify-center"
                        >
                          <Plus size={12} className="md:w-[14px] md:h-[14px]" /> System
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add a repeatable action to this goal</p>
                      </TooltipContent>
                    </Tooltip>
                    <button 
                      onClick={() => onOpenModal('deleteSystem', system.id)} 
                      className="text-destructive/60 hover:bg-destructive/10 px-2 py-1 rounded"
                    >
                      <Trash2 size={14} className="md:w-4 md:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              {/* Mobile Card View */}
              <div className="block sm:hidden p-3 space-y-3">
                {system.habits.length === 0 ? (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-xs text-muted-foreground">No systems yet. Add your first repeatable action!</p>
                    <button
                      onClick={() => onOpenModal('addHabitToSystem', system.id)}
                      className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Plus size={16} /> Add First System
                    </button>
                  </div>
                ) : (
                  system.habits.map((h, hIdx) => (
                    <div key={`${h.id}-${hIdx}`} className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-card-foreground flex-1">{h.name}</span>
                        <div className="flex gap-1 flex-shrink-0">
                          <button 
                            onClick={() => onOpenModal('editHabit', { systemId: system.id, habitId: h.id }, h.name)} 
                            className="text-muted-foreground hover:text-primary p-1 hover:bg-muted rounded"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={() => onOpenModal('deleteHabit', { systemId: system.id, habitId: h.id })} 
                            className="text-destructive/60 p-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {DAYS.map((d, i) => {
                          const isToday = weekOffset === 0 && i === currentDayIndex;
                          const dateKey = weekDates[i];
                          return (
                            <div key={d} className="flex flex-col items-center">
                              <span className={`text-[10px] font-medium mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                                {d.slice(0, 2)}
                              </span>
                              <label className="cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={h.completed[dateKey] || false}
                                  onChange={() => toggleHabit(system.id, h.id, i)}
                                  disabled={weekOffset > 0}
                                  className={`w-6 h-6 rounded border-2 cursor-pointer appearance-none transition-colors
                                    ${h.completed[dateKey] ? 'bg-success border-success' : 'bg-card border-border'}
                                    ${isToday ? 'ring-2 ring-primary/30' : ''}
                                    ${weekOffset > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  style={{ WebkitAppearance: 'none' }}
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop/Tablet Table View */}
              <div className="hidden sm:block overflow-x-auto">
                {system.habits.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-sm text-muted-foreground">No systems yet. Add your first repeatable action!</p>
                    <button
                      onClick={() => onOpenModal('addHabitToSystem', system.id)}
                      className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Plus size={16} /> Add First System
                    </button>
                  </div>
                ) : (
                  <table className="w-full" style={{ minWidth: '500px' }}>
                    <thead className="bg-muted text-[10px] md:text-xs text-muted-foreground font-bold uppercase">
                      <tr>
                        <th className="p-2 md:p-3 text-left" style={{ width: '40%' }}>System / Action</th>
                        {DAYS.map((d, i) => {
                          const isToday = weekOffset === 0 && i === currentDayIndex;
                          return (
                            <th 
                              key={d} 
                              className={`p-2 md:p-3 text-center ${isToday ? 'bg-primary/10 text-primary' : ''}`}
                              style={{ width: `${60 / 8}%` }}
                            >
                              {d.slice(0, 3)}
                            </th>
                          );
                        })}
                        <th className="p-2 md:p-3" style={{ width: '5%' }}></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {system.habits.map((h, hIdx) => (
                        <tr key={`${h.id}-${hIdx}`}>
                          <td className="p-2 md:p-3 text-xs md:text-sm">
                            <div className="flex items-center gap-2">
                              <span className="break-words line-clamp-2">{h.name}</span>
                              <button 
                                onClick={() => onOpenModal('editHabit', { systemId: system.id, habitId: h.id }, h.name)} 
                                className="text-muted-foreground/50 hover:text-primary p-1 hover:bg-muted rounded flex-shrink-0"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                          </td>
                          {DAYS.map((_, i) => {
                            const isToday = weekOffset === 0 && i === currentDayIndex;
                            const dateKey = weekDates[i];
                            return (
                              <td key={i} className={`p-2 md:p-3 text-center ${isToday ? 'bg-primary/5' : ''}`}>
                                <label className="inline-flex items-center justify-center cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={h.completed[dateKey] || false}
                                    onChange={() => toggleHabit(system.id, h.id, i)}
                                    disabled={weekOffset > 0}
                                    className={`w-5 h-5 md:w-6 md:h-6 rounded border-2 border-border bg-card checked:bg-success checked:border-success cursor-pointer accent-success ${weekOffset > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  />
                                </label>
                              </td>
                            );
                          })}
                          <td className="p-2 md:p-3">
                            <button 
                              onClick={() => onOpenModal('deleteHabit', { systemId: system.id, habitId: h.id })} 
                              className="text-destructive/60"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  );
}
