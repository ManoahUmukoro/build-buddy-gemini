import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Minimize2, User, Headphones } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  content: string;
  is_read: boolean;
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [adminJoined, setAdminJoined] = useState(false);
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

  // Subscribe to realtime updates for chat messages
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`chat-messages-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            
            // Check if admin joined
            if (newMessage.sender_type === 'admin' && !adminJoined) {
              setAdminJoined(true);
            }
            
            return [...prev, newMessage];
          });
          
          // Mark as read if from admin
          if (newMessage.sender_type === 'admin') {
            markMessageAsRead(newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, adminJoined]);

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
        .maybeSingle();

      if (existingTicket && !fetchError) {
        setTicketId(existingTicket.id);
        await loadMessages(existingTicket.id);
      } else {
        // Create new ticket
        const { data: newTicket, error: createError } = await supabase
          .from('support_tickets')
          .insert({
            user_id: user.id,
            subject: 'Live Chat Support',
            message: 'Chat session started',
            status: 'open',
          })
          .select()
          .single();

        if (createError) throw createError;
        
        setTicketId(newTicket.id);
        setMessages([]);
        setAdminJoined(false);
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
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('ticket_id', tid)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const chatMessages = (data || []) as ChatMessage[];
      setMessages(chatMessages);
      
      // Check if admin has joined
      const hasAdminMessage = chatMessages.some(m => m.sender_type === 'admin');
      setAdminJoined(hasAdminMessage);
      
      // Mark admin messages as read
      const unreadAdminMessages = chatMessages.filter(m => m.sender_type === 'admin' && !m.is_read);
      for (const msg of unreadAdminMessages) {
        markMessageAsRead(msg.id);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !ticketId || !user || isSending) return;

    const messageText = input.trim();
    setInput('');
    setIsSending(true);

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          sender_type: 'user',
          content: messageText,
        });

      if (error) throw error;
      
      // Update ticket to in_progress if first message
      if (messages.length === 0) {
        await supabase
          .from('support_tickets')
          .update({ message: messageText })
          .eq('id', ticketId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setInput(messageText);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 md:bottom-24 right-4 md:right-8 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl z-[200] overflow-hidden flex flex-col max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-full relative">
            <MessageCircle size={18} className="text-primary" />
            {adminJoined && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-card" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-sm text-card-foreground">Live Support</h4>
            <p className="text-[10px] text-muted-foreground">
              {adminJoined ? 'Agent connected' : 'Waiting for agent...'}
            </p>
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
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="p-3 bg-primary/10 rounded-full mb-3">
              <Headphones size={24} className="text-primary" />
            </div>
            <p className="text-sm font-medium text-card-foreground mb-1">
              Hi {profile?.display_name || 'there'}! 👋
            </p>
            <p className="text-xs text-muted-foreground">
              Send us a message and we'll get back to you shortly.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isFirstAdminMessage = msg.sender_type === 'admin' && 
                !messages.slice(0, index).some(m => m.sender_type === 'admin');
              
              return (
                <div key={msg.id}>
                  {isFirstAdminMessage && (
                    <div className="flex items-center justify-center gap-2 py-2">
                      <div className="h-px bg-border flex-1" />
                      <span className="text-[10px] text-muted-foreground px-2">
                        Support agent joined the chat
                      </span>
                      <div className="h-px bg-border flex-1" />
                    </div>
                  )}
                  <div className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender_type === 'admin' && (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2 shrink-0">
                        <Headphones size={12} className="text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                        msg.sender_type === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-card-foreground rounded-bl-md'
                      }`}
                    >
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <span className={`text-[10px] block mt-1 ${
                        msg.sender_type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {msg.sender_type === 'user' && (
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center ml-2 shrink-0">
                        <User size={12} className="text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
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
            disabled={isLoading || isSending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading || isSending}
            className="rounded-xl"
          >
            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
      </form>
    </div>
  );
}