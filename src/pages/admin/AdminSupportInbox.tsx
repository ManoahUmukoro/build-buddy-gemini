import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Inbox, MessageSquare, User, Clock, CheckCircle, 
  AlertCircle, Loader2, ChevronDown, Send
} from 'lucide-react';

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-warning/20 text-warning', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-primary/20 text-primary', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-success/20 text-success', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-muted text-muted-foreground', icon: CheckCircle },
};

export default function AdminSupportInbox() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each ticket
      const ticketsWithProfiles = await Promise.all(
        (data || []).map(async (ticket) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', ticket.user_id)
            .single();

          return {
            ...ticket,
            status: ticket.status as SupportTicket['status'],
            user_name: profile?.display_name || 'Unknown User',
          };
        })
      );

      setTickets(ticketsWithProfiles);
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

  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setAdminNotes(ticket.admin_notes || '');
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Inbox className="text-primary" />
              Support Inbox
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage user support tickets and feedback
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
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
                        <h3 className="font-medium text-sm truncate flex-1">{ticket.subject}</h3>
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

            {/* Ticket Detail */}
            <div className="lg:col-span-2">
              {selectedTicket ? (
                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">{selectedTicket.subject}</h2>
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

                  {/* Message */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                      <MessageSquare size={14} />
                      User Message
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
                  </div>

                  {/* Admin Notes */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Admin Notes</label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes about this ticket..."
                      rows={4}
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSaveNotes}
                      disabled={isSaving}
                      className="mt-2"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} className="mr-1" />}
                      Save Notes
                    </Button>
                  </div>

                  {/* Status Actions */}
                  <div className="border-t border-border pt-4">
                    <p className="text-sm font-medium mb-2">Update Status</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTicket.status !== 'in_progress' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleUpdateStatus('in_progress')}
                          disabled={isSaving}
                        >
                          <Clock size={14} className="mr-1" />
                          Mark In Progress
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
                          Mark Resolved
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
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                  <MessageSquare className="mx-auto text-muted-foreground mb-4" size={48} />
                  <h3 className="font-semibold text-lg mb-2">Select a Ticket</h3>
                  <p className="text-muted-foreground text-sm">
                    Click on a ticket from the list to view details
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
