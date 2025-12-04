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

  const toggleHabit = (systemId: number, habitId: number, dayIndex: number) => {
    const key = `d${dayIndex}`;
    setSystems(prev => prev.map(s => 
      s.id === systemId 
        ? {
            ...s,
            habits: s.habits.map(h => 
              h.id === habitId 
                ? { ...h, completed: { ...h.completed, [key]: !h.completed[key] } }
                : h
            )
          }
        : s
    ));
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl shadow-soft border border-border">
        <div>
          <h3 className="font-bold text-card-foreground text-lg">Systems & Goals</h3>
          <p className="text-xs text-muted-foreground">Identity based habits.</p>
        </div>
        <button 
          onClick={() => onOpenModal('addSystem', null, "I am a...")}
          className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm hover:bg-secondary/80 flex items-center gap-2 transition-colors"
        >
          <Target size={16} /> New Goal
        </button>
      </div>

      {systems.map((system, sysIdx) => (
        <div key={`${system.id}-${sysIdx}`} className="bg-card rounded-xl shadow-soft border border-border overflow-hidden">
          <div className="bg-muted p-4 border-b border-border flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-card-foreground flex items-center gap-2 text-lg">
                  <Target size={18} className="text-primary" />
                  {system.goal}
                </h4>
                <button 
                  onClick={() => onOpenModal('editSystem', system.id, system.goal, system.why)} 
                  className="bg-primary/10 text-primary hover:bg-primary/20 p-1.5 rounded-md transition-colors ml-2" 
                  title="Edit Goal"
                >
                  <Edit2 size={14} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground italic mt-1">{system.why}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => onOpenModal('generateSystems', { systemId: system.id, goalName: system.goal })} 
                className="text-primary hover:bg-primary/10 px-3 py-1 rounded text-sm font-bold border border-primary/20 flex items-center gap-1"
              >
                <Sparkles size={14} /> AI Systems
              </button>
              <button 
                onClick={() => onOpenModal('addHabitToSystem', system.id)} 
                className="text-primary hover:bg-primary/10 px-3 py-1 rounded text-sm font-bold border border-primary/20 flex items-center gap-1"
              >
                <Plus size={14} /> Manual
              </button>
              <button 
                onClick={() => onOpenModal('deleteSystem', system.id)} 
                className="text-destructive/60 hover:bg-destructive/10 px-2 py-1 rounded"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-muted text-xs text-muted-foreground font-bold uppercase">
                <tr>
                  <th className="p-3 text-left w-1/3">System / Action</th>
                  {DAYS.map((d, i) => (
                    <th 
                      key={d} 
                      className={`p-3 text-center ${i === currentDayIndex ? 'bg-primary/10 text-primary rounded-t-lg' : ''}`}
                    >
                      {d.slice(0, 3)}
                    </th>
                  ))}
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {system.habits.map((h, hIdx) => (
                  <tr key={`${h.id}-${hIdx}`}>
                    <td className="p-3 text-sm flex items-center gap-2">
                      {h.name}
                      <button 
                        onClick={() => onOpenModal('editHabit', { systemId: system.id, habitId: h.id }, h.name)} 
                        className="text-muted-foreground/50 hover:text-primary p-1 hover:bg-muted rounded"
                      >
                        <Edit2 size={12} />
                      </button>
                    </td>
                    {DAYS.map((_, i) => (
                      <td key={i} className={`p-3 text-center ${i === currentDayIndex ? 'bg-primary/5' : ''}`}>
                        <button 
                          onClick={() => toggleHabit(system.id, h.id, i)}
                          className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                            h.completed[`d${i}`] 
                              ? 'bg-success border-success text-success-foreground shadow-soft' 
                              : 'bg-card hover:border-muted-foreground/50'
                          }`}
                        >
                          {h.completed[`d${i}`] && "✓"}
                        </button>
                      </td>
                    ))}
                    <td className="p-3">
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
          </div>
        </div>
      ))}
    </div>
  );
}
