import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Minimize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  content: string;
  sender_type: 'user' | 'admin';
  created_at: string;
}

interface LiveSupportChatProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
}

export function LiveSupportChat({ isOpen, onClose, onMinimize }: LiveSupportChatProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Load or create support ticket on open
  useEffect(() => {
    if (isOpen && user) {
      loadOrCreateTicket();
    }
  }, [isOpen, user]);

  // Subscribe to realtime updates for the ticket
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`support-ticket-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${ticketId}`,
        },
        (payload) => {
          // Reload messages when ticket is updated
          loadMessages(ticketId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const loadOrCreateTicket = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Check for existing open ticket
      const { data: existingTicket, error: fetchError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingTicket && !fetchError) {
        setTicketId(existingTicket.id);
        loadMessages(existingTicket.id);
      } else {
        // Create new ticket
        const { data: newTicket, error: createError } = await supabase
          .from('support_tickets')
          .insert({
            user_id: user.id,
            subject: 'Live Chat Support',
            message: '',
            status: 'open',
          })
          .select()
          .single();

        if (createError) throw createError;
        
        setTicketId(newTicket.id);
        setMessages([
          {
            id: 'welcome',
            content: `Hi ${profile?.display_name || 'there'}! 👋 How can we help you today?`,
            sender_type: 'admin',
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading support ticket:', error);
      toast.error('Failed to start chat session');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (tid: string) => {
    try {
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', tid)
        .single();

      if (error) throw error;

      // Parse messages from ticket metadata or message field
      const ticketMessages: Message[] = [];
      
      // Add initial message if exists
      if (ticket.message) {
        ticketMessages.push({
          id: 'initial',
          content: ticket.message,
          sender_type: 'user',
          created_at: ticket.created_at,
        });
      }
      
      // Add admin notes as response if exists
      if (ticket.admin_notes) {
        ticketMessages.push({
          id: 'response',
          content: ticket.admin_notes,
          sender_type: 'admin',
          created_at: ticket.updated_at,
        });
      }

      // Add welcome message if no messages
      if (ticketMessages.length === 0) {
        ticketMessages.push({
          id: 'welcome',
          content: `Hi ${profile?.display_name || 'there'}! 👋 How can we help you today?`,
          sender_type: 'admin',
          created_at: new Date().toISOString(),
        });
      }

      setMessages(ticketMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !ticketId || isLoading) return;

    const messageText = input.trim();
    setInput('');
    
    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageText,
      sender_type: 'user',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      // Update ticket with new message
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          message: messageText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) throw error;
      
      // Add auto-response for demo
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: `auto-${Date.now()}`,
            content: "Thanks for your message! Our support team will respond shortly. For urgent issues, please email support@webnexer.com",
            sender_type: 'admin',
            created_at: new Date().toISOString(),
          },
        ]);
      }, 1000);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      // Remove optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setInput(messageText);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 md:bottom-24 right-4 md:right-8 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl z-[200] overflow-hidden flex flex-col max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-full">
            <MessageCircle size={18} className="text-primary" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-card-foreground">Live Support</h4>
            <p className="text-[10px] text-muted-foreground">We typically reply in minutes</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            >
              <Minimize2 size={16} className="text-muted-foreground" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.sender_type === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-card-foreground rounded-bl-md'
                }`}
              >
                <p className="leading-relaxed">{msg.content}</p>
                <span className={`text-[10px] block mt-1 ${
                  msg.sender_type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 border-t border-border bg-muted/30">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="rounded-xl"
          >
            <Send size={18} />
          </Button>
        </div>
      </form>
    </div>
  );
}
