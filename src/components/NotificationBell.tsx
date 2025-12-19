import { useState, useRef, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { AlertItem } from '@/lib/types';

interface NotificationBellProps {
  alerts: AlertItem[];
  onClear: () => void;
}

export function NotificationBell({ alerts, onClear }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const requestNotifyPermission = async () => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification('LifeOS Notifications Enabled!', {
            body: 'You will now receive task reminders.',
            icon: '/favicon.ico'
          });
        }
      }
    } catch (e) {
      console.error('Notification permission error:', e);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sidebar-foreground/60 hover:text-sidebar-foreground relative p-2"
      >
        <Bell size={20} />
        {alerts.length > 0 && (
          <div className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></div>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-card text-card-foreground rounded-xl shadow-xl p-4 z-[201] border border-border">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-sm">Notifications</h4>
            <div className="flex gap-2">
              <button
                onClick={requestNotifyPermission}
                className="text-[10px] text-primary hover:underline font-bold"
              >
                Enable Browser
              </button>
              {alerts.length > 0 && (
                <button onClick={onClear} className="text-muted-foreground hover:text-destructive">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {alerts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No new alerts.</p>
            ) : (
              alerts.map((a, i) => (
                <div key={i} className="text-xs border-b border-border pb-1">
                  <span className="font-bold block text-card-foreground">{a.time}</span>
                  {a.text}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}