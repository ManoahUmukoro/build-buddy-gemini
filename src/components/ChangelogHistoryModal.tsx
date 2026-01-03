import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles, Star, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Json } from '@/integrations/supabase/types';

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  changes: Json;
  is_major: boolean | null;
  release_date: string;
  created_at: string | null;
}

interface ChangelogHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogHistoryModal({ isOpen, onClose }: ChangelogHistoryModalProps) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchAllChangelog();
    }
  }, [isOpen]);

  const fetchAllChangelog = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_changelog')
        .select('*')
        .order('release_date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error('Error fetching changelog:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const parseChanges = (changes: Json): string[] => {
    if (Array.isArray(changes)) {
      return changes.map(c => String(c));
    }
    if (typeof changes === 'string') {
      try {
        const parsed = JSON.parse(changes);
        return Array.isArray(parsed) ? parsed.map(c => String(c)) : [changes];
      } catch {
        return [changes];
      }
    }
    return [];
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="What's New" maxWidth="max-w-2xl">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="mx-auto mb-4 opacity-50" size={40} />
          <p>No updates yet. Check back soon!</p>
        </div>
      ) : (
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {entries.map((entry, idx) => (
              <div 
                key={entry.id} 
                className={`p-4 rounded-xl border ${
                  idx === 0 
                    ? 'border-primary/30 bg-primary/5' 
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={entry.is_major ? 'default' : 'secondary'} className="text-xs">
                        v{entry.version}
                      </Badge>
                      {entry.is_major && (
                        <Star size={14} className="text-warning fill-warning" />
                      )}
                      {idx === 0 && (
                        <Badge variant="outline" className="text-xs text-primary border-primary/30">
                          Latest
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-foreground">{entry.title}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(entry.release_date)}
                  </span>
                </div>
                
                <ul className="space-y-2">
                  {parseChanges(entry.changes).map((change, i) => (
                    <li 
                      key={i} 
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="text-primary mt-1">•</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </Modal>
  );
}