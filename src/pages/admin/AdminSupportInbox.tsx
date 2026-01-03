import { useState, useEffect, useCallback, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Inbox, MessageSquare, User, Clock, CheckCircle, 
  AlertCircle, Loader2, Send, Headphones, RefreshCw
} from 'lucide-react';

interface ChatMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  content: string;
  is_read: boolean;
  created_at: string;
}

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  unread_count?: number;
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-warning/20 text-warning', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-primary/20 text-primary', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-success/20 text-success', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-muted text-muted-foreground', icon: CheckCircle },
};

export default function AdminSupportInbox() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTickets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles and unread counts for each ticket
      const ticketsWithData = await Promise.all(
        (data || []).map(async (ticket) => {
          const [profileResult, unreadResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', ticket.user_id)
              .single(),
            supabase
              .from('chat_messages')
              .select('id', { count: 'exact' })
              .eq('ticket_id', ticket.id)
              .eq('sender_type', 'user')
              .eq('is_read', false)
          ]);

          return {
            ...ticket,
            status: ticket.status as SupportTicket['status'],
            user_name: profileResult.data?.display_name || 'Unknown User',
            unread_count: unreadResult.count || 0,
          };
        })
      );

      setTickets(ticketsWithData);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Subscribe to new tickets and messages
  useEffect(() => {
    const ticketChannel = supabase
      .channel('admin-tickets')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          fetchTickets();
          toast.info('New support ticket received');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
    };
  }, [fetchTickets]);

  // Subscribe to messages for selected ticket
  useEffect(() => {
    if (!selectedTicket) return;

    const messageChannel = supabase
      .channel(`admin-messages-${selectedTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          
          // Mark user messages as read
          if (newMessage.sender_type === 'user') {
            markMessageAsRead(newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [selectedTicket?.id]);

  const loadMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setMessages((data || []) as ChatMessage[]);
      
      // Mark all user messages as read
      const unreadUserMessages = (data || []).filter(
        (m: ChatMessage) => m.sender_type === 'user' && !m.is_read
      );
      for (const msg of unreadUserMessages) {
        await markMessageAsRead(msg.id);
      }
      
      // Update unread count in tickets list
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, unread_count: 0 } : t
      ));
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

  const handleSelectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setAdminNotes(ticket.admin_notes || '');
    setMessageInput('');
    await loadMessages(ticket.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedTicket || !user || isSendingMessage) return;

    const messageText = messageInput.trim();
    setMessageInput('');
    setIsSendingMessage(true);

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          sender_type: 'admin',
          content: messageText,
        });

      if (error) throw error;
      
      // Update ticket status to in_progress if it was open
      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id);
        
        setSelectedTicket(prev => prev ? { ...prev, status: 'in_progress' } : null);
        setTickets(prev => prev.map(t => 
          t.id === selectedTicket.id ? { ...t, status: 'in_progress' } : t
        ));
      }

      // Notify user via email about admin reply
      try {
        await supabase.functions.invoke('notify-ticket-reply', {
          body: {
            ticket_id: selectedTicket.id,
            user_id: selectedTicket.user_id,
            admin_message: messageText,
            ticket_subject: selectedTicket.subject
          }
        });
      } catch (emailError) {
        console.warn('Could not send email notification:', emailError);
        // Don't fail the whole operation if email fails
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setMessageInput(messageText);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleUpdateStatus = async (status: SupportTicket['status']) => {
    if (!selectedTicket) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status, admin_notes: adminNotes })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      setTickets(prev => prev.map(t => 
        t.id === selectedTicket.id ? { ...t, status, admin_notes: adminNotes } : t
      ));
      setSelectedTicket(prev => prev ? { ...prev, status, admin_notes: adminNotes } : null);
      
      toast.success(`Ticket marked as ${STATUS_CONFIG[status].label}`);
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedTicket) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ admin_notes: adminNotes })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      setTickets(prev => prev.map(t => 
        t.id === selectedTicket.id ? { ...t, admin_notes: adminNotes } : t
      ));
      setSelectedTicket(prev => prev ? { ...prev, admin_notes: adminNotes } : null);
      
      toast.success('Notes saved');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTickets = statusFilter === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === statusFilter);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalUnread = tickets.reduce((acc, t) => acc + (t.unread_count || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Inbox className="text-primary" />
              Support Inbox
              {totalUnread > 0 && (
                <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                  {totalUnread} new
                </span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage user support tickets and live chat
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchTickets}>
              <RefreshCw size={14} className="mr-1" />
              Refresh
            </Button>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">All Tickets ({tickets.length})</option>
              <option value="open">Open ({tickets.filter(t => t.status === 'open').length})</option>
              <option value="in_progress">In Progress ({tickets.filter(t => t.status === 'in_progress').length})</option>
              <option value="resolved">Resolved ({tickets.filter(t => t.status === 'resolved').length})</option>
              <option value="closed">Closed ({tickets.filter(t => t.status === 'closed').length})</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tickets List */}
            <div className="lg:col-span-1 space-y-2 max-h-[700px] overflow-y-auto">
              {filteredTickets.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <Inbox className="mx-auto text-muted-foreground mb-4" size={40} />
                  <p className="text-muted-foreground">No tickets found</p>
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const StatusIcon = STATUS_CONFIG[ticket.status].icon;
                  return (
                    <button
                      key={ticket.id}
                      onClick={() => handleSelectTicket(ticket)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selectedTicket?.id === ticket.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{ticket.subject}</h3>
                          {(ticket.unread_count || 0) > 0 && (
                            <span className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full shrink-0">
                              {ticket.unread_count}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${STATUS_CONFIG[ticket.status].color}`}>
                          {STATUS_CONFIG[ticket.status].label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {ticket.message}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User size={10} />
                          {ticket.user_name}
                        </span>
                        <span>{formatDate(ticket.created_at)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Ticket Detail with Live Chat */}
            <div className="lg:col-span-2">
              {selectedTicket ? (
                <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-[700px]">
                  {/* Header */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-bold">{selectedTicket.subject}</h2>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {selectedTicket.user_name}
                          </span>
                          <span>{formatDate(selectedTicket.created_at)}</span>
                        </div>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full ${STATUS_CONFIG[selectedTicket.status].color}`}>
                        {STATUS_CONFIG[selectedTicket.status].label}
                      </span>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageSquare className="text-muted-foreground mb-2" size={32} />
                        <p className="text-sm text-muted-foreground">No messages yet</p>
                        <p className="text-xs text-muted-foreground">Send a message to start the conversation</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                          {msg.sender_type === 'user' && (
                            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center mr-2 shrink-0">
                              <User size={14} className="text-secondary-foreground" />
                            </div>
                          )}
                          <div
                            className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                              msg.sender_type === 'admin'
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-card border border-border text-card-foreground rounded-bl-md'
                            }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <span className={`text-[10px] block mt-1 ${
                              msg.sender_type === 'admin' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {msg.sender_type === 'admin' && (
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center ml-2 shrink-0">
                              <Headphones size={14} className="text-primary" />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-card">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Type your reply..."
                        className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        disabled={isSendingMessage}
                      />
                      <Button
                        type="submit"
                        disabled={!messageInput.trim() || isSendingMessage}
                        className="rounded-xl"
                      >
                        {isSendingMessage ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      </Button>
                    </div>
                  </form>

                  {/* Quick Actions & Notes */}
                  <div className="p-4 border-t border-border bg-muted/30 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {selectedTicket.status !== 'in_progress' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleUpdateStatus('in_progress')}
                          disabled={isSaving}
                        >
                          <Clock size={14} className="mr-1" />
                          In Progress
                        </Button>
                      )}
                      {selectedTicket.status !== 'resolved' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleUpdateStatus('resolved')}
                          disabled={isSaving}
                          className="text-success border-success/50 hover:bg-success/10"
                        >
                          <CheckCircle size={14} className="mr-1" />
                          Resolved
                        </Button>
                      )}
                      {selectedTicket.status !== 'closed' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleUpdateStatus('closed')}
                          disabled={isSaving}
                        >
                          Close Ticket
                        </Button>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block text-muted-foreground">Internal Notes</label>
                      <div className="flex gap-2">
                        <Textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Add internal notes..."
                          rows={2}
                          className="text-sm"
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleSaveNotes}
                          disabled={isSaving}
                          className="shrink-0"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-12 text-center h-[700px] flex flex-col items-center justify-center">
                  <MessageSquare className="mx-auto text-muted-foreground mb-4" size={48} />
                  <h3 className="font-semibold text-lg mb-2">Select a Ticket</h3>
                  <p className="text-muted-foreground text-sm">
                    Click on a ticket from the list to view and reply
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}