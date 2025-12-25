import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, RotateCcw, Timer, Target, Check, X, Minimize2, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FocusReflectionModal } from '@/components/FocusReflectionModal';

interface Task {
  id: string | number;
  text: string;
  done: boolean;
}

interface FloatingFocusTimerProps {
  todayTasks?: Task[];
  onSessionComplete?: (duration: number, taskLabel: string, reflection?: string) => void;
  onClose?: () => void;
}

const DURATION_OPTIONS = [
  { value: '5', label: '5 min' },
  { value: '15', label: '15 min' },
  { value: '25', label: '25 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
];

export function FloatingFocusTimer({ todayTasks = [], onSessionComplete, onClose }: FloatingFocusTimerProps) {
  const { user } = useAuth();
  // If onClose is provided, we're in "controlled" mode from FloatingActionHub - always show
  const [isOpen, setIsOpen] = useState(!!onClose);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('25');
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [customTaskLabel, setCustomTaskLabel] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(25 * 60);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [completedSessionData, setCompletedSessionData] = useState<{ taskLabel: string; duration: number } | null>(null);

  const incompleteTasks = todayTasks.filter(t => !t.done);
  
  const getTaskLabel = useCallback(() => {
    if (selectedTask === 'custom') return customTaskLabel;
    const task = todayTasks.find(t => String(t.id) === selectedTask);
    return task?.text || 'Focus Session';
  }, [selectedTask, customTaskLabel, todayTasks]);

  const getDurationSeconds = useCallback(() => {
    return parseInt(selectedDuration) * 60;
  }, [selectedDuration]);

  useEffect(() => {
    if (!hasStarted) {
      const seconds = getDurationSeconds();
      setTimeRemaining(seconds);
      setSessionDuration(seconds);
    }
  }, [selectedDuration, hasStarted, getDurationSeconds]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && hasStarted) {
      handleSessionComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeRemaining, hasStarted]);

  const handleSessionComplete = async (skipReflection = false) => {
    setIsRunning(false);
    const taskLabel = getTaskLabel();
    const durationMinutes = Math.ceil(sessionDuration / 60);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Focus Session Complete! 🎉', {
        body: `You focused on "${taskLabel}" for ${durationMinutes} minutes`,
        icon: '/favicon.ico',
      });
    }

    // Show reflection modal
    setCompletedSessionData({ taskLabel, duration: durationMinutes });
    setShowReflectionModal(true);
  };

  const saveSession = async (reflection?: string) => {
    if (!completedSessionData || !user) return;

    const { taskLabel, duration: durationMinutes } = completedSessionData;
    const taskId = selectedTask !== 'custom' && selectedTask ? selectedTask : null;

    try {
      await supabase.from('focus_sessions').insert({
        user_id: user.id,
        task_id: taskId,
        task_label: taskLabel,
        duration_minutes: durationMinutes,
        completed_at: new Date().toISOString(),
      });

      // Log reflection to activity feed if provided
      if (reflection) {
        await supabase.from('activity_feed').insert({
          user_id: user.id,
          event_type: 'focus_reflection',
          event_data: {
            task_label: taskLabel,
            duration_minutes: durationMinutes,
            reflection: reflection,
          },
          related_table: 'focus_sessions',
        });
      }
    } catch (error) {
      console.error('Failed to log focus session:', error);
    }

    toast.success('🎉 Focus Session Complete!', {
      description: `Great work on "${taskLabel}" for ${durationMinutes} minutes!`,
    });

    onSessionComplete?.(durationMinutes, taskLabel, reflection);
    resetTimer();
    setCompletedSessionData(null);
  };

  const handleReflectionSave = (reflection: string) => {
    saveSession(reflection);
  };

  const handleReflectionSkip = () => {
    saveSession();
  };

  const startTimer = () => {
    if (!hasStarted) {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      setHasStarted(true);
    }
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setHasStarted(false);
    const seconds = getDurationSeconds();
    setTimeRemaining(seconds);
    setSessionDuration(seconds);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progress = ((sessionDuration - timeRemaining) / sessionDuration) * 100;

  const handleClose = () => {
    setIsOpen(false);
    resetTimer();
    onClose?.();
  };

  // Standalone mode - render floating button when not open
  if (!isOpen && !onClose) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 bg-primary text-primary-foreground p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
          title="Open Focus Timer"
        >
          <Timer className="h-6 w-6" />
        </button>

        <FocusReflectionModal
          isOpen={showReflectionModal}
          onClose={() => setShowReflectionModal(false)}
          taskLabel={completedSessionData?.taskLabel || ''}
          durationMinutes={completedSessionData?.duration || 0}
          onSave={handleReflectionSave}
          onSkip={handleReflectionSkip}
        />
      </>
    );
  }

  if (isMinimized && hasStarted) {
    return (
      <>
        <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 bg-card border border-border rounded-full shadow-xl p-3 flex items-center gap-3">
          <div className={`text-lg font-bold tabular-nums ${isRunning ? 'text-primary' : 'text-muted-foreground'}`}>
            {formatTime(timeRemaining)}
          </div>
          {isRunning ? (
            <Button size="icon" variant="ghost" onClick={pauseTimer} className="h-8 w-8">
              <Pause className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" onClick={startTimer} className="h-8 w-8">
              <Play className="h-4 w-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={() => setIsMinimized(false)} className="h-8 w-8">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <FocusReflectionModal
          isOpen={showReflectionModal}
          onClose={() => setShowReflectionModal(false)}
          taskLabel={completedSessionData?.taskLabel || ''}
          durationMinutes={completedSessionData?.duration || 0}
          onSave={handleReflectionSave}
          onSkip={handleReflectionSkip}
        />
      </>
    );
  }

  return (
    <>
      <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 bg-card border border-border rounded-xl shadow-xl w-72 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/50">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Timer className="h-4 w-4 text-primary" />
            Focus Timer
          </div>
          <div className="flex items-center gap-1">
            {hasStarted && (
              <Button size="icon" variant="ghost" onClick={() => setIsMinimized(true)} className="h-7 w-7">
                <Minimize2 className="h-3 w-3" />
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={handleClose} className="h-7 w-7">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {!hasStarted ? (
            <>
              {/* Duration */}
              <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Task */}
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Focus on..." />
                </SelectTrigger>
                <SelectContent>
                  {incompleteTasks.map(task => (
                    <SelectItem key={String(task.id)} value={String(task.id)}>
                      <span className="truncate max-w-[180px] block">{task.text}</span>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom...</SelectItem>
                </SelectContent>
              </Select>

              {selectedTask === 'custom' && (
                <Input
                  placeholder="What are you focusing on?"
                  value={customTaskLabel}
                  onChange={(e) => setCustomTaskLabel(e.target.value)}
                  className="h-9 text-sm"
                />
              )}

              <Button onClick={startTimer} className="w-full" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Start Focus
              </Button>
            </>
          ) : (
            <>
              {/* Timer Display */}
              <div className="relative flex justify-center">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="6" fill="none" className="text-muted" />
                    <circle
                      cx="48" cy="48" r="42"
                      stroke="currentColor" strokeWidth="6" fill="none"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                      className="text-primary transition-all duration-1000"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold tabular-nums">{formatTime(timeRemaining)}</span>
                  </div>
                </div>
              </div>

              {/* Task Badge */}
              <div className="text-center">
                <div className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                  <Target className="h-3 w-3" />
                  <span className="truncate max-w-[150px]">{getTaskLabel()}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-2">
                {isRunning ? (
                  <Button onClick={pauseTimer} variant="secondary" size="sm">
                    <Pause className="h-4 w-4 mr-1" /> Pause
                  </Button>
                ) : (
                  <Button onClick={startTimer} size="sm">
                    <Play className="h-4 w-4 mr-1" /> Resume
                  </Button>
                )}
                <Button onClick={resetTimer} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button onClick={() => handleSessionComplete()} variant="ghost" size="sm">
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <FocusReflectionModal
        isOpen={showReflectionModal}
        onClose={() => setShowReflectionModal(false)}
        taskLabel={completedSessionData?.taskLabel || ''}
        durationMinutes={completedSessionData?.duration || 0}
        onSave={handleReflectionSave}
        onSkip={handleReflectionSkip}
      />
    </>
  );
}
