import { useState, useRef, type KeyboardEvent } from 'react';
import { Plus, Trash2, Mic, MicOff, Lightbulb, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Task } from '@/lib/types';

interface IdeaDumpProps {
  ideas: Task[];
  onAddIdea: (text: string) => void;
  onDeleteIdea: (id: string | number) => void;
}

export function IdeaDump({ ideas, onAddIdea, onDeleteIdea }: IdeaDumpProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [newIdea, setNewIdea] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  const startRecording = async () => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      toast.error('Voice transcription isn\'t supported in this browser.');
      return;
    }

    try {
      finalTranscriptRef.current = '';

      const recognition = new SpeechRecognitionCtor();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onresult = (event: any) => {
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = String(event.results[i][0]?.transcript || '');
          if (event.results[i].isFinal) {
            finalTranscriptRef.current = `${finalTranscriptRef.current} ${piece}`.trim();
          } else {
            interim = `${interim} ${piece}`.trim();
          }
        }

        const combined = `${finalTranscriptRef.current} ${interim}`.trim();
        if (combined) setNewIdea(combined);
      };

      recognition.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsRecording(false);
        setIsTranscribing(false);
        toast.error('Voice transcription failed. Please try again.');
      };

      recognition.onend = () => {
        setIsTranscribing(false);
        setIsRecording(false);
        recognitionRef.current = null;

        const transcript = (finalTranscriptRef.current || newIdea).trim();
        if (transcript) {
          setNewIdea(transcript);
          toast.success('Transcription ready — review and tap + to save.');
        } else {
          toast.info('No speech detected. You can type your idea instead.');
        }
      };

      recognition.start();
      setIsRecording(true);
      toast.info('Listening… tap again to stop.');
    } catch (error) {
      console.error('Error starting transcription:', error);
      toast.error('Could not start voice transcription.');
    }
  };

  const stopRecording = () => {
    if (!recognitionRef.current) {
      setIsRecording(false);
      return;
    }

    setIsRecording(false);
    setIsTranscribing(true);

    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Error stopping transcription:', error);
      setIsTranscribing(false);
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

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
