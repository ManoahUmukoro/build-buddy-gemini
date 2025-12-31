import { useState } from 'react';
import { Clock, Bell, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskInputModalProps {
  value: string;
  onChange: (value: string) => void;
  time: string;
  onTimeChange: (time: string) => void;
  reminderEnabled: boolean;
  onReminderChange: (enabled: boolean) => void;
  isGenerating?: boolean;
  placeholder?: string;
  showTimeReminder?: boolean;
}

export function TaskInputModal({
  value,
  onChange,
  time,
  onTimeChange,
  reminderEnabled,
  onReminderChange,
  isGenerating = false,
  placeholder = "What needs to be done?",
  showTimeReminder = true,
}: TaskInputModalProps) {
  const [showTimePicker, setShowTimePicker] = useState(false);

  return (
    <div className="space-y-4">
      {/* Helper text */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Info size={14} className="shrink-0 mt-0.5 text-primary" />
        <span>Add specific, actionable tasks for today. Be clear about what needs to be done.</span>
      </div>

      {/* Task input */}
      <input
        autoFocus
        className="w-full p-4 bg-muted border-0 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-lg text-card-foreground placeholder:text-muted-foreground"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isGenerating}
      />

      {/* Time & Reminder section */}
      {showTimeReminder && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-3 bg-muted/50 rounded-xl">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant={time ? "secondary" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setShowTimePicker(!showTimePicker)}
            >
              <Clock size={14} />
              {time || "Set Time"}
            </Button>
            
            {showTimePicker && (
              <input
                type="time"
                value={time}
                onChange={(e) => onTimeChange(e.target.value)}
                className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground"
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Bell size={14} className={reminderEnabled ? "text-primary" : "text-muted-foreground"} />
                  <span className="text-sm text-muted-foreground">Remind Me</span>
                  <Switch
                    checked={reminderEnabled}
                    onCheckedChange={onReminderChange}
                    disabled={!time}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {time ? "Get notified when this task is due" : "Set a time first to enable reminders"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}
