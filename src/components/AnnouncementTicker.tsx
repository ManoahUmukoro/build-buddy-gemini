import { useState, useEffect } from 'react';
import { Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Announcement {
  id: string;
  title: string;
  message: string;
}

export function AnnouncementTicker() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('id, title, message')
          .eq('is_active', true)
          .order('priority', { ascending: true });

        if (error) throw error;
        setAnnouncements(data || []);
      } catch (err) {
        console.error('Error fetching announcements:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncements();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading || announcements.length === 0) return null;

  const tickerText = announcements
    .map(a => `🔔 ${a.title}: ${a.message}`)
    .join('     •     ');

  return (
    <div className="bg-primary/10 border-b border-primary/20 overflow-hidden">
      <div className="flex items-center">
        <div className="bg-primary text-primary-foreground px-3 py-2 flex items-center gap-2 shrink-0 z-10">
          <Megaphone size={16} />
          <span className="text-xs font-semibold hidden sm:inline">Updates</span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="animate-ticker whitespace-nowrap py-2 text-sm text-foreground">
            {tickerText}
            <span className="mx-8">•</span>
            {tickerText}
          </div>
        </div>
      </div>
    </div>
  );
}
