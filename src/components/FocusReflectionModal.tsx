import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/Modal';
import { Timer, Sparkles, Save, SkipForward } from 'lucide-react';

interface FocusReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskLabel: string;
  durationMinutes: number;
  onSave: (reflection: string) => void;
  onSkip: () => void;
}

export function FocusReflectionModal({
  isOpen,
  onClose,
  taskLabel,
  durationMinutes,
  onSave,
  onSkip,
}: FocusReflectionModalProps) {
  const [reflection, setReflection] = useState('');

  const handleSave = () => {
    onSave(reflection);
    setReflection('');
    onClose();
  };

  const handleSkip = () => {
    onSkip();
    setReflection('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Focus Session Complete! 🎉" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Session Summary */}
        <div className="flex items-center gap-3 p-4 bg-success/10 rounded-xl border border-success/20">
          <div className="p-2 bg-success/20 rounded-full">
            <Timer className="h-5 w-5 text-success" />
          </div>
          <div>
            <div className="font-medium text-card-foreground">{taskLabel}</div>
            <div className="text-sm text-muted-foreground">{durationMinutes} minutes focused</div>
          </div>
        </div>

        {/* Quick Reflection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles size={14} className="text-primary" />
            Quick Reflection (optional)
          </div>
          <Textarea
            placeholder="What did you accomplish? Any thoughts or insights?"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            className="min-h-[80px] resize-none"
            maxLength={280}
          />
          <div className="text-xs text-muted-foreground text-right">
            {reflection.length}/280
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleSkip} className="flex-1">
            <SkipForward size={16} className="mr-2" />
            Skip
          </Button>
          <Button onClick={handleSave} className="flex-1" disabled={!reflection.trim()}>
            <Save size={16} className="mr-2" />
            Save Reflection
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Reflections are logged to your activity feed and can help with journal entries.
        </p>
      </div>
    </Modal>
  );
}
