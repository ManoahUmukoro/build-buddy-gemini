import { useState } from 'react';
import { History, ArrowUpCircle, ArrowDownCircle, Trash2, Loader2 } from 'lucide-react';
import { useSavingsEntries, SavingsEntry } from '@/hooks/useSavingsEntries';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface SavingsEntriesHistoryProps {
  goalId: string;
  goalName: string;
  currency: string;
}

export function SavingsEntriesHistory({ goalId, goalName, currency }: SavingsEntriesHistoryProps) {
  const { entries, loading, deleteEntry } = useSavingsEntries(goalId);
  const [isOpen, setIsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const success = await deleteEntry(id);
    if (success) {
      toast.success('Entry deleted');
    } else {
      toast.error('Failed to delete entry');
    }
    setDeletingId(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History size={14} />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History size={18} className="text-primary" />
            {goalName} - Transaction History
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No transactions yet. Add a deposit or withdrawal to see history.
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  {entry.type === 'deposit' ? (
                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                      <ArrowUpCircle size={16} className="text-success" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                      <ArrowDownCircle size={16} className="text-destructive" />
                    </div>
                  )}
                  <div>
                    <p className={`font-semibold text-sm ${
                      entry.type === 'deposit' ? 'text-success' : 'text-destructive'
                    }`}>
                      {entry.type === 'deposit' ? '+' : '-'}{formatCurrency(entry.amount, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString()}
                      {entry.note && ` • ${entry.note}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(entry.id)}
                  disabled={deletingId === entry.id}
                  className="text-muted-foreground hover:text-destructive"
                >
                  {deletingId === entry.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
