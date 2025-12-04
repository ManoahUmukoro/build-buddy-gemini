import { useState } from 'react';
import { Book, Save, Loader2, MessageCircle, Edit2, BarChart3 } from 'lucide-react';
import { JournalEntry, ChatMessage } from '@/lib/types';
import { MOODS } from '@/lib/constants';
import { Modal } from '@/components/Modal';
import { ChatInterface } from '@/components/ChatInterface';

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20 md:pb-0">
      {/* Journal Form */}
      <div className="bg-card p-6 rounded-xl shadow-soft border border-border h-fit">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-card-foreground flex items-center gap-2">
            <Book size={18} />
            {editingEntryId ? 'Edit Entry' : "Today's Journal"}
          </h3>
          <button 
            onClick={onWeeklyReport} 
            className="text-primary text-xs bg-primary/10 px-3 py-1 rounded-full font-bold hover:bg-primary/20 flex items-center gap-1" 
            title="Generate Insight"
          >
            <BarChart3 size={12} /> Weekly Report
          </button>
        </div>
        
        <form onSubmit={onSaveJournal} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-muted-foreground mb-2">Mood</label>
            <div className="flex justify-between bg-muted p-3 rounded-xl border border-border">
              {MOODS.map(m => (
                <button 
                  type="button" 
                  key={m.value} 
                  onClick={() => setTodayEntry({ ...todayEntry, mood: m.value })}
                  className={`p-2 rounded-full transition-all transform ${
                    todayEntry.mood === m.value 
                      ? 'bg-card shadow-soft scale-110' 
                      : 'opacity-40 hover:opacity-100 hover:scale-105'
                  }`} 
                  title={m.label}
                >
                  <span className="text-2xl">{m.emoji}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Win</label>
            <input 
              className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-card" 
              value={todayEntry.win} 
              onChange={e => setTodayEntry({ ...todayEntry, win: e.target.value })}
              placeholder="What went well?" 
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Thoughts</label>
            <textarea 
              className="w-full p-3 border border-border rounded-lg h-32 focus:ring-2 focus:ring-primary/20 outline-none resize-none bg-card" 
              value={todayEntry.thoughts} 
              onChange={e => setTodayEntry({ ...todayEntry, thoughts: e.target.value })}
              placeholder="Clear your mind..."
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button 
              type="submit" 
              disabled={isSavingJournal} 
              className={`flex-1 text-secondary-foreground py-2.5 rounded-lg hover:opacity-90 flex justify-center items-center gap-2 font-medium ${
                editingEntryId ? 'bg-primary' : 'bg-secondary'
              }`}
            >
              {isSavingJournal ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {isSavingJournal ? "Saving..." : "Save"}
            </button>
            <button 
              type="button" 
              onClick={() => setIsJournalChatOpen(true)} 
              className="px-4 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 flex items-center gap-2 font-medium"
            >
              <MessageCircle size={18} /> Chat with Buddy
            </button>
          </div>
        </form>
      </div>

      {/* Past Entries */}
      <div className="space-y-4">
        <h3 className="font-bold text-card-foreground">Past Entries</h3>
        {journalEntries.map((entry, idx) => (
          <div key={`${entry.id}-${idx}`} className="bg-card p-5 rounded-xl shadow-soft border border-border">
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
