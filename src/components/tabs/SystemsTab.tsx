import { Plus, Target, Sparkles, Trash2, Edit2 } from 'lucide-react';
import { System } from '@/lib/types';
import { DAYS } from '@/lib/constants';
import { getCurrentDayIndex } from '@/lib/formatters';

interface SystemsTabProps {
  systems: System[];
  setSystems: React.Dispatch<React.SetStateAction<System[]>>;
  onOpenModal: (type: string, data?: any, initialValue?: string, initialWhy?: string) => void;
}

export function SystemsTab({ systems, setSystems, onOpenModal }: SystemsTabProps) {
  const currentDayIndex = getCurrentDayIndex();

  const toggleHabit = (systemId: string | number, habitId: string | number, dayIndex: number) => {
    const key = `d${dayIndex}`;
    setSystems(prev => prev.map(s => 
      String(s.id) === String(systemId) 
        ? {
            ...s,
            habits: s.habits.map(h => 
              String(h.id) === String(habitId) 
                ? { ...h, completed: { ...h.completed, [key]: !h.completed[key] } }
                : h
            )
          }
        : s
    ));
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-3 md:p-4 rounded-xl shadow-soft border border-border">
        <div>
          <h3 className="font-bold text-card-foreground text-base md:text-lg">Systems & Goals</h3>
          <p className="text-xs text-muted-foreground">Identity based habits.</p>
        </div>
        <button 
          onClick={() => onOpenModal('addSystem', null, "I am a...")}
          className="bg-secondary text-secondary-foreground px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm hover:bg-secondary/80 flex items-center gap-1.5 md:gap-2 transition-colors w-full sm:w-auto justify-center"
        >
          <Target size={14} className="md:w-4 md:h-4" /> New Goal
        </button>
      </div>

      {systems.map((system, sysIdx) => (
        <div key={`${system.id}-${sysIdx}`} className="bg-card rounded-xl shadow-soft border border-border overflow-hidden min-h-[200px]">
          <div className="bg-muted p-3 md:p-4 border-b border-border">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-card-foreground flex items-center gap-1.5 md:gap-2 text-sm md:text-lg">
                    <Target size={14} className="text-primary md:w-[18px] md:h-[18px] flex-shrink-0" />
                    <span className="break-words">{system.goal}</span>
                  </h4>
                  <button 
                    onClick={() => onOpenModal('editSystem', system.id, system.goal, system.why)} 
                    className="bg-primary/10 text-primary hover:bg-primary/20 p-1 md:p-1.5 rounded-md transition-colors flex-shrink-0" 
                    title="Edit Goal"
                  >
                    <Edit2 size={12} className="md:w-[14px] md:h-[14px]" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">{system.why}</p>
              </div>
              <div className="flex gap-1.5 md:gap-2 flex-wrap w-full sm:w-auto">
                <button 
                  onClick={() => onOpenModal('generateSystems', { systemId: system.id, goalName: system.goal })} 
                  className="text-primary hover:bg-primary/10 px-2 md:px-3 py-1 rounded text-xs md:text-sm font-bold border border-primary/20 flex items-center gap-1 flex-1 sm:flex-initial justify-center"
                >
                  <Sparkles size={12} className="md:w-[14px] md:h-[14px]" /> AI
                </button>
                <button 
                  onClick={() => onOpenModal('addHabitToSystem', system.id)} 
                  className="text-primary hover:bg-primary/10 px-2 md:px-3 py-1 rounded text-xs md:text-sm font-bold border border-primary/20 flex items-center gap-1 flex-1 sm:flex-initial justify-center"
                >
                  <Plus size={12} className="md:w-[14px] md:h-[14px]" /> Add
                </button>
                <button 
                  onClick={() => onOpenModal('deleteSystem', system.id)} 
                  className="text-destructive/60 hover:bg-destructive/10 px-2 py-1 rounded"
                >
                  <Trash2 size={14} className="md:w-4 md:h-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead className="bg-muted text-[10px] md:text-xs text-muted-foreground font-bold uppercase">
                <tr>
                  <th className="p-2 md:p-3 text-left w-1/3">System / Action</th>
                  {DAYS.map((d, i) => (
                    <th 
                      key={d} 
                      className={`p-1.5 md:p-3 text-center ${i === currentDayIndex ? 'bg-primary/10 text-primary rounded-t-lg' : ''}`}
                    >
                      {d.slice(0, 2)}
                    </th>
                  ))}
                  <th className="p-1.5 md:p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {system.habits.map((h, hIdx) => (
                  <tr key={`${h.id}-${hIdx}`}>
                    <td className="p-2 md:p-3 text-xs md:text-sm">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <span className="break-words line-clamp-2">{h.name}</span>
                        <button 
                          onClick={() => onOpenModal('editHabit', { systemId: system.id, habitId: h.id }, h.name)} 
                          className="text-muted-foreground/50 hover:text-primary p-0.5 md:p-1 hover:bg-muted rounded flex-shrink-0"
                        >
                          <Edit2 size={10} className="md:w-3 md:h-3" />
                        </button>
                      </div>
                    </td>
                    {DAYS.map((_, i) => (
                      <td key={i} className={`p-1 md:p-3 text-center ${i === currentDayIndex ? 'bg-primary/5' : ''}`}>
                        <button 
                          onClick={() => toggleHabit(system.id, h.id, i)}
                          className={`w-6 h-6 md:w-6 md:h-6 rounded border flex items-center justify-center transition-colors text-xs mx-auto ${
                            h.completed[`d${i}`] 
                              ? 'bg-success border-success text-success-foreground shadow-soft' 
                              : 'bg-card border-border hover:border-muted-foreground/50'
                          }`}
                        >
                          {h.completed[`d${i}`] && "✓"}
                        </button>
                      </td>
                    ))}
                    <td className="p-1.5 md:p-3">
                      <button 
                        onClick={() => onOpenModal('deleteHabit', { systemId: system.id, habitId: h.id })} 
                        className="text-destructive/60"
                      >
                        <Trash2 size={12} className="md:w-[14px] md:h-[14px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
