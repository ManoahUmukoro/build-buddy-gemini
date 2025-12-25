import { useState } from 'react';
import { Book, Save, Loader2, MessageCircle, Edit2, BarChart3, Sparkles, Wand2 } from 'lucide-react';
import { JournalEntry, ChatMessage } from '@/lib/types';
import { MOODS } from '@/lib/constants';
import { Modal } from '@/components/Modal';
import { ChatInterface } from '@/components/ChatInterface';
import { Button } from '@/components/ui/button';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useAI } from '@/hooks/useAI';
import { toast } from 'sonner';

interface JournalTabProps {
  journalEntries: JournalEntry[];
  setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  todayEntry: {
    mood: number;
    win: string;
    improve: string;
    thoughts: string;
  };
  setTodayEntry: React.Dispatch<React.SetStateAction<{
    mood: number;
    win: string;
    improve: string;
    thoughts: string;
  }>>;
  editingEntryId: string | number | null;
  setEditingEntryId: (id: string | number | null) => void;
  isSavingJournal: boolean;
  journalChatHistory: ChatMessage[];
  onSaveJournal: (e: React.FormEvent) => void;
  onJournalChat: (text: string, imageBase64: string | null) => void;
  onWeeklyReport: () => void;
}

export function JournalTab({
  journalEntries,
  todayEntry,
  setTodayEntry,
  editingEntryId,
  setEditingEntryId,
  isSavingJournal,
  journalChatHistory,
  onSaveJournal,
  onJournalChat,
  onWeeklyReport,
}: JournalTabProps) {
  const [isJournalChatOpen, setIsJournalChatOpen] = useState(false);
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);
  const { getTodayActivities } = useActivityFeed();
  const ai = useAI();

  const handleRecapMyDay = async () => {
    const todayActivities = getTodayActivities();
    
    if (todayActivities.length === 0) {
      toast.info("No activities logged today yet. Complete some tasks or habits first!");
      return;
    }

    setIsGeneratingRecap(true);
    
    try {
      const recap = await ai.journalRecap(todayActivities.map(a => ({
        event_type: a.event_type,
        event_data: a.event_data,
        created_at: a.created_at
      })));

      if (recap) {
        setTodayEntry(prev => ({
          ...prev,
          thoughts: recap,
          mood: prev.mood || 3,
        }));
        toast.success("Journal draft generated! Feel free to edit it.");
      } else {
        toast.error("Failed to generate recap. Please try again.");
      }
    } catch (error) {
      console.error('Recap generation failed:', error);
      toast.error("Failed to generate recap.");
    } finally {
      setIsGeneratingRecap(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 pb-20 md:pb-0 px-1 md:px-0">
      {/* Journal Form */}
      <div className="bg-card p-4 md:p-6 rounded-xl shadow-soft border border-border h-fit">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <h3 className="font-bold text-card-foreground flex items-center gap-2 text-sm md:text-base">
            <Book size={16} className="md:w-[18px] md:h-[18px]" />
            {editingEntryId ? 'Edit Entry' : "Today's Journal"}
          </h3>
          <div className="flex gap-1.5 md:gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRecapMyDay}
              disabled={isGeneratingRecap}
              className="text-primary text-[10px] md:text-xs bg-primary/10 hover:bg-primary/20 px-2 md:px-3 py-1 h-auto"
              title="Generate journal draft from today's activities"
            >
              {isGeneratingRecap ? (
                <Loader2 className="animate-spin h-3 w-3 mr-1" />
              ) : (
                <Wand2 size={10} className="mr-1 md:w-3 md:h-3" />
              )}
              Recap
            </Button>
            <button 
              onClick={onWeeklyReport} 
              className="text-primary text-[10px] md:text-xs bg-primary/10 px-2 md:px-3 py-1 rounded-full font-bold hover:bg-primary/20 flex items-center gap-1" 
              title="Generate Insight"
            >
              <BarChart3 size={10} className="md:w-3 md:h-3" /> Report
            </button>
          </div>
        </div>
        
        <form onSubmit={onSaveJournal} className="space-y-3 md:space-y-4">
          <div>
            <label className="block text-[10px] md:text-xs font-bold uppercase text-muted-foreground mb-1.5 md:mb-2">Mood</label>
            <div className="flex justify-between bg-muted p-2 md:p-3 rounded-lg md:rounded-xl border border-border">
              {MOODS.map(m => (
                <button 
                  type="button" 
                  key={m.value} 
                  onClick={() => setTodayEntry({ ...todayEntry, mood: m.value })}
                  className={`p-1.5 md:p-2 rounded-full transition-all transform ${
                    todayEntry.mood === m.value 
                      ? 'bg-card shadow-soft scale-110' 
                      : 'opacity-40 hover:opacity-100 hover:scale-105'
                  }`} 
                  title={m.label}
                >
                  <span className="text-lg md:text-2xl">{m.emoji}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] md:text-xs font-bold uppercase text-muted-foreground mb-1">Win</label>
            <input 
              className="w-full p-2.5 md:p-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-card text-sm" 
              value={todayEntry.win} 
              onChange={e => setTodayEntry({ ...todayEntry, win: e.target.value })}
              placeholder="What went well?" 
            />
          </div>
          
          <div>
            <label className="block text-[10px] md:text-xs font-bold uppercase text-muted-foreground mb-1">Thoughts</label>
            <textarea 
              className="w-full p-2.5 md:p-3 border border-border rounded-lg h-24 md:h-32 focus:ring-2 focus:ring-primary/20 outline-none resize-none bg-card text-sm" 
              value={todayEntry.thoughts} 
              onChange={e => setTodayEntry({ ...todayEntry, thoughts: e.target.value })}
              placeholder="Clear your mind..."
            />
          </div>
          
          <div className="flex gap-2 md:gap-3 pt-2">
            <button 
              type="submit" 
              disabled={isSavingJournal} 
              className={`flex-1 text-secondary-foreground py-2 md:py-2.5 rounded-lg hover:opacity-90 flex justify-center items-center gap-1.5 md:gap-2 font-medium text-sm ${
                editingEntryId ? 'bg-primary' : 'bg-secondary'
              }`}
            >
              {isSavingJournal ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              {isSavingJournal ? "Saving..." : "Save"}
            </button>
            <button 
              type="button" 
              onClick={() => setIsJournalChatOpen(true)} 
              className="px-3 md:px-4 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 flex items-center gap-1.5 md:gap-2 font-medium text-sm"
            >
              <MessageCircle size={14} className="md:w-[18px] md:h-[18px]" /> <span className="hidden sm:inline">Chat with</span> Buddy
            </button>
          </div>
        </form>
      </div>

      {/* Past Entries */}
      <div className="space-y-3 md:space-y-4">
        <h3 className="font-bold text-card-foreground text-sm md:text-base">Past Entries</h3>
        {journalEntries.length === 0 ? (
          <div className="bg-card p-6 md:p-8 rounded-xl border border-border text-center text-muted-foreground">
            <Book className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3 opacity-30" />
            <p className="text-sm">No journal entries yet.</p>
            <p className="text-xs md:text-sm mt-1">Start journaling to track your thoughts and growth!</p>
          </div>
        ) : journalEntries.map((entry, idx) => (
          <div key={`${entry.id}-${idx}`} className="bg-card p-4 md:p-5 rounded-xl shadow-soft border border-border">
            <div className="flex justify-between items-start mb-3 border-b border-border pb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{entry.date}</span>
              <div className="flex items-center gap-2">
                <span className="text-xl">{MOODS.find(m => m.value === entry.mood)?.emoji}</span>
                <button 
                  onClick={() => {
                    setTodayEntry({
                      mood: entry.mood,
                      win: entry.win,
                      improve: entry.improve,
                      thoughts: entry.thoughts
                    });
                    setEditingEntryId(entry.id);
                  }} 
                  className="p-1 text-muted-foreground/50 hover:text-primary"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              {entry.win && (
                <div>
                  <span className="font-semibold text-success">Win:</span> {entry.win}
                </div>
              )}
              {entry.thoughts && (
                <div className="mt-2 p-3 bg-muted rounded-lg italic text-muted-foreground">
                  "{entry.thoughts}"
                </div>
              )}
              {entry.tags && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {entry.tags.map((tag, i) => (
                    <span key={i} className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Journal Chat Modal */}
      <Modal 
        isOpen={isJournalChatOpen} 
        onClose={() => setIsJournalChatOpen(false)} 
        title="Session with Buddy" 
        maxWidth="max-w-2xl"
      >
        <ChatInterface 
          history={journalChatHistory} 
          onSend={onJournalChat} 
          isLoading={isSavingJournal} 
          personaName="Buddy" 
          placeholder="What's on your mind?" 
        />
      </Modal>
    </div>
  );
}
