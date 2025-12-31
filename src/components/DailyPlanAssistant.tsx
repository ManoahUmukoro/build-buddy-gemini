import { useState } from 'react';
import { Sparkles, Loader2, Info, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface DailyPlanAssistantProps {
  value: string;
  onChange: (value: string) => void;
  isGenerating: boolean;
  onGenerate: (e?: React.FormEvent) => void;
  onCancel: () => void;
}

export function DailyPlanAssistant({
  value,
  onChange,
  isGenerating,
  onGenerate,
  onCancel,
}: DailyPlanAssistantProps) {
  return (
    <div className="space-y-4">
      {/* Feature description panel */}
      <div className="bg-primary/10 p-4 rounded-xl border border-primary/20">
        <div className="flex items-start gap-3">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Calendar size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-card-foreground mb-1 flex items-center gap-2">
              Daily Plan Assistant
              <Sparkles size={14} className="text-primary" />
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Describe your day in natural language – your work tasks, errands, meetings, 
              and energy level. AI will create a structured schedule with time blocks 
              optimized for your productivity.
            </p>
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
          <Info size={12} />
          Describe Your Day
        </label>
        <Textarea
          placeholder={`Example: "I have a team meeting at 10am, need to finish the quarterly report, grab groceries, and I'm feeling low energy today. I work best in the morning."`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[120px] resize-none"
          disabled={isGenerating}
        />
      </div>

      {/* Tips */}
      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-1">
        <p className="font-medium text-foreground">Tips for better results:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-1">
          <li>Mention fixed appointments with times</li>
          <li>Include your energy level (high/low energy)</li>
          <li>Add any deadlines or priorities</li>
          <li>Note preferred work hours</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isGenerating}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || !value.trim()}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating Plan...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate Schedule
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
