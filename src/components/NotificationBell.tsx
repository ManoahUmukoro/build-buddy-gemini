import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { 
    notifications, 
    unreadCount, 
    getNotificationMessage, 
    getTimeAgo, 
    clearNotifications,
    markAllRead 
  } = useNotifications();

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

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      markAllRead();
    }
  };

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

  // Get icon for event type
  const getEventIcon = (eventType: string) => {
    const iconMap: Record<string, string> = {
      'task_completed': '✅',
      'task_created': '📝',
      'habit_completed': '🎯',
      'transaction_created': '💰',
      'focus_completed': '⏱️',
      'focus_reflection': '💭',
      'journal_created': '📔',
      'savings_deposit': '💵',
      'savings_withdrawal': '💸',
      'goal_created': '🎯',
    };
    return iconMap[eventType] || '📢';
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={handleOpen}
        className="text-sidebar-foreground/60 hover:text-sidebar-foreground relative p-2"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <div className="absolute top-1 right-1 w-4 h-4 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 md:right-0 w-72 md:w-80 bg-card text-card-foreground rounded-xl shadow-xl p-3 md:p-4 z-[201] border border-border max-h-[350px] md:max-h-[400px] overflow-hidden flex flex-col" style={{ transform: 'translateX(min(0px, calc(100vw - 100% - 1rem)))' }}>
          <div className="flex justify-between items-center mb-3 shrink-0">
            <h4 className="font-bold text-sm">Notifications</h4>
            <div className="flex gap-2">
              <button
                onClick={requestNotifyPermission}
                className="text-[10px] text-primary hover:underline font-bold"
              >
                Enable Browser
              </button>
              {notifications.length > 0 && (
                <button 
                  onClick={clearNotifications} 
                  className="text-muted-foreground hover:text-destructive"
                  title="Clear all"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="mx-auto mb-2 opacity-30" size={24} />
                <p className="text-xs">No notifications yet.</p>
                <p className="text-xs mt-1">Activity will appear here.</p>
              </div>
            ) : (
              notifications.slice(0, 15).map((n) => (
                <div 
                  key={n.id} 
                  className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <span className="text-base shrink-0">{getEventIcon(n.event_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-card-foreground truncate">
                      {getNotificationMessage(n)}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {getTimeAgo(n.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
