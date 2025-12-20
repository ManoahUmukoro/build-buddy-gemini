import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Timer, Target, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Task {
  id: string | number;
  text: string;
  done: boolean;
}

interface FocusTimerProps {
  todayTasks?: Task[];
  onSessionComplete?: (duration: number, taskLabel: string) => void;
}

const DURATION_OPTIONS = [
  { value: '5', label: '5 min' },
  { value: '15', label: '15 min' },
  { value: '25', label: '25 min (Pomodoro)' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: 'custom', label: 'Custom' },
];

export function FocusTimer({ todayTasks = [], onSessionComplete }: FocusTimerProps) {
  const { user } = useAuth();
  const [selectedDuration, setSelectedDuration] = useState('25');
  const [customDuration, setCustomDuration] = useState('');
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [customTaskLabel, setCustomTaskLabel] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(25 * 60);

  const incompleteTasks = todayTasks.filter(t => !t.done);
  
  const getTaskLabel = useCallback(() => {
    if (selectedTask === 'custom') return customTaskLabel;
    const task = todayTasks.find(t => String(t.id) === selectedTask);
    return task?.text || 'Focus Session';
  }, [selectedTask, customTaskLabel, todayTasks]);

  const getDurationSeconds = useCallback(() => {
    if (selectedDuration === 'custom') {
      return (parseInt(customDuration) || 25) * 60;
    }
    return parseInt(selectedDuration) * 60;
  }, [selectedDuration, customDuration]);

  // Update timer when duration changes (before starting)
  useEffect(() => {
    if (!hasStarted) {
      const seconds = getDurationSeconds();
      setTimeRemaining(seconds);
      setSessionDuration(seconds);
    }
  }, [selectedDuration, customDuration, hasStarted, getDurationSeconds]);

  // Timer countdown
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

  const handleSessionComplete = async () => {
    setIsRunning(false);
    const taskLabel = getTaskLabel();
    const durationMinutes = Math.ceil(sessionDuration / 60);

    // Show notifications
    toast.success('🎉 Focus Session Complete!', {
      description: `Great work on "${taskLabel}" for ${durationMinutes} minutes!`,
    });

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Focus Session Complete! 🎉', {
        body: `You focused on "${taskLabel}" for ${durationMinutes} minutes`,
        icon: '/favicon.ico',
      });
    }

    // Log session to database
    if (user) {
      try {
        const taskId = selectedTask !== 'custom' && selectedTask ? selectedTask : null;
        await supabase.from('focus_sessions').insert({
          user_id: user.id,
          task_id: taskId,
          task_label: taskLabel,
          duration_minutes: durationMinutes,
          completed_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to log focus session:', error);
      }
    }

    onSessionComplete?.(durationMinutes, taskLabel);
    resetTimer();
  };

  const startTimer = () => {
    if (!hasStarted) {
      // Request notification permission
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-5 w-5 text-primary" />
          Focus Timer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasStarted ? (
          <>
            {/* Duration Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Duration</Label>
              <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDuration === 'custom' && (
                <Input
                  type="number"
                  placeholder="Minutes"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  className="h-9"
                  min="1"
                  max="180"
                />
              )}
            </div>

            {/* Task Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Focus on</Label>
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  {incompleteTasks.map(task => (
                    <SelectItem key={String(task.id)} value={String(task.id)}>
                      <span className="truncate max-w-[200px] block">{task.text}</span>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom label...</SelectItem>
                </SelectContent>
              </Select>
              {selectedTask === 'custom' && (
                <Input
                  placeholder="What are you focusing on?"
                  value={customTaskLabel}
                  onChange={(e) => setCustomTaskLabel(e.target.value)}
                  className="h-9"
                />
              )}
            </div>

            {/* Start Button */}
            <Button onClick={startTimer} className="w-full" size="sm">
              <Play className="h-4 w-4 mr-2" />
              Start Focus Session
            </Button>
          </>
        ) : (
          <>
            {/* Progress Ring */}
            <div className="relative flex justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 58}`}
                    strokeDashoffset={`${2 * Math.PI * 58 * (1 - progress / 100)}`}
                    className="text-primary transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold tabular-nums">{formatTime(timeRemaining)}</span>
                </div>
              </div>
            </div>

            {/* Current Task Badge */}
            <div className="text-center">
              <Badge variant="secondary" className="text-xs px-3 py-1">
                <Target className="h-3 w-3 mr-1" />
                {getTaskLabel()}
              </Badge>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-2">
              {isRunning ? (
                <Button onClick={pauseTimer} variant="secondary" size="sm">
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              ) : (
                <Button onClick={startTimer} size="sm">
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </Button>
              )}
              <Button onClick={resetTimer} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button onClick={handleSessionComplete} variant="ghost" size="sm">
                <Check className="h-4 w-4 mr-1" />
                Done
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
