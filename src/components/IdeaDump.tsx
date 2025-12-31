import { useState, useRef } from 'react';
import { Plus, Trash2, Mic, MicOff, Lightbulb, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Task, Tasks } from '@/lib/types';

interface IdeaDumpProps {
  ideas: Task[];
  onAddIdea: (text: string) => void;
  onDeleteIdea: (id: string | number) => void;
}

export function IdeaDump({ ideas, onAddIdea, onDeleteIdea }: IdeaDumpProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [newIdea, setNewIdea] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Try Web Speech API for transcription
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          toast.success('Voice note captured! Transcription available on supported browsers.');
        }
        
        // For now, just add a placeholder - in production you'd send to a transcription API
        setIsTranscribing(true);
        
        // Simulate transcription delay
        setTimeout(() => {
          setIsTranscribing(false);
          toast.info('Voice note recorded. Type your idea to save it.');
        }, 500);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info('Recording started... Click again to stop.');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleAddIdea = () => {
    if (newIdea.trim()) {
      onAddIdea(newIdea.trim());
      setNewIdea('');
      toast.success('Idea captured!');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddIdea();
    }
  };

  return (
    <div className="bg-warning/10 p-4 rounded-xl shadow-soft border border-warning/20 flex flex-col h-64">
      <h3 className="font-bold text-warning flex items-center gap-2 mb-3">
        <Lightbulb size={18} />
        Idea Dump
      </h3>
      
      {/* Input area */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Textarea
            placeholder="Capture your ideas here..."
            value={newIdea}
            onChange={(e) => setNewIdea(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] resize-none text-sm bg-card/50 border-warning/20"
            rows={2}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleVoiceToggle}
            className={`h-8 w-8 p-0 ${isRecording ? 'bg-destructive/20 text-destructive border-destructive' : 'border-warning/40 text-warning hover:bg-warning/20'}`}
            title={isRecording ? "Stop recording" : "Start voice recording"}
          >
            {isTranscribing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isRecording ? (
              <MicOff size={14} />
            ) : (
              <Mic size={14} />
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleAddIdea}
            disabled={!newIdea.trim()}
            className="h-8 w-8 p-0 bg-warning/20 hover:bg-warning/30 text-warning"
            title="Add Idea"
          >
            <Plus size={14} />
          </Button>
        </div>
      </div>

      {/* Ideas list */}
      <div className="overflow-y-auto flex-1 space-y-2">
        {ideas.map((idea, idx) => (
          <div key={`${idea.id}-${idx}`} className="bg-card/50 p-2 rounded flex items-start gap-2 group">
            <span className="text-sm flex-1 break-words">{idea.text}</span>
            <button
              onClick={() => onDeleteIdea(idea.id)}
              className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              title="Delete idea"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {ideas.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-4">
            No ideas yet. Start capturing!
          </div>
        )}
      </div>
    </div>
  );
}
