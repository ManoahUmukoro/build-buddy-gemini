import { useState, useEffect } from 'react';
import { X, Sparkles, Gift, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  changes: string[];
  release_date: string;
  is_major: boolean;
}

export function WhatsNewModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    checkForUpdates();
  }, [user]);

  const checkForUpdates = async () => {
    if (!user) return;

    try {
      // Get user's last seen version from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_seen_changelog_version')
        .eq('user_id', user.id)
        .single();

      const lastSeenVersion = profile?.last_seen_changelog_version || '0.0.0';

      // Fetch changelog entries newer than last seen
      const { data: changelog, error } = await supabase
        .from('app_changelog')
        .select('*')
        .order('release_date', { ascending: false });

      if (error) throw error;

      // Filter to entries newer than last seen version
      const newEntries = (changelog || []).filter(entry => 
        compareVersions(entry.version, lastSeenVersion) > 0
      ).map(entry => ({
        ...entry,
        changes: Array.isArray(entry.changes) ? entry.changes : JSON.parse(entry.changes as string),
      }));

      if (newEntries.length > 0) {
        setEntries(newEntries as ChangelogEntry[]);
        setIsOpen(true);
      }
    } catch (err) {
      console.error('Error checking for updates:', err);
    } finally {
      setLoading(false);
    }
  };

  const compareVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  };

  const handleDismiss = async () => {
    if (!user || entries.length === 0) {
      setIsOpen(false);
      return;
    }

    try {
      // Update user's last seen version to the latest
      const latestVersion = entries[0]?.version || '0.0.0';
      
      await supabase
        .from('profiles')
        .update({ last_seen_changelog_version: latestVersion })
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error updating last seen version:', err);
    } finally {
      setIsOpen(false);
    }
  };

  if (loading || entries.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            What's New
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {entries.map((entry) => (
              <div key={entry.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={entry.is_major ? 'default' : 'secondary'} className="text-xs">
                    v{entry.version}
                  </Badge>
                  {entry.is_major && (
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Major Update
                    </Badge>
                  )}
                </div>
                
                <h3 className="font-semibold text-foreground">{entry.title}</h3>
                
                <ul className="space-y-2">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
                
                <p className="text-xs text-muted-foreground">
                  Released {new Date(entry.release_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={handleDismiss} className="gap-2">
            Got it!
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
