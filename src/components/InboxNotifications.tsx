import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useInboxNotifications, InboxNotification } from '@/hooks/useInboxNotifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function InboxNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<InboxNotification | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const { 
    notifications, 
    unreadCount, 
    markAsRead,
    markAllAsRead,
    getTimeAgo,
    getNotificationIcon,
  } = useInboxNotifications();

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
  };

  const handleNotificationClick = async (notification: InboxNotification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    setSelectedNotification(notification);
  };

  const requestNotifyPermission = async () => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification('LifeOS Notifications Enabled!', {
            body: 'You will now receive push notifications.',
            icon: '/lifeos-logo.png'
          });
        }
      }
    } catch (e) {
      console.error('Notification permission error:', e);
    }
  };

  return (
    <>
      <div className="relative" ref={popoverRef}>
        <button
          onClick={handleOpen}
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground relative p-2"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full text-[10px] text-primary-foreground flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </button>
        
        {isOpen && (
          <div 
            className="absolute top-full mt-2 right-0 w-80 bg-card text-card-foreground rounded-2xl shadow-xl p-4 z-[201] max-h-[400px] overflow-hidden flex flex-col" 
            style={{ right: '0px', maxWidth: 'calc(100vw - 1rem)' }}
          >
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h4 className="font-bold text-sm">Inbox</h4>
              <div className="flex gap-2">
                <button
                  onClick={requestNotifyPermission}
                  className="text-[10px] text-primary hover:underline font-bold"
                >
                  Enable Push
                </button>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead} 
                    className="text-muted-foreground hover:text-primary flex items-center gap-1 text-[10px]"
                    title="Mark all as read"
                  >
                    <CheckCheck size={12} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="mx-auto mb-2 opacity-30" size={24} />
                  <p className="text-xs">Your inbox is empty.</p>
                  <p className="text-xs mt-1">Important updates will appear here.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button 
                    key={n.id} 
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl transition-colors text-left ${
                      n.is_read 
                        ? 'bg-transparent hover:bg-muted/50' 
                        : 'bg-primary/5 hover:bg-primary/10'
                    }`}
                  >
                    <span className="text-lg shrink-0">{getNotificationIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${n.is_read ? 'text-muted-foreground' : 'text-foreground font-semibold'}`}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-muted-foreground/70">
                        {getTimeAgo(n.created_at)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notification Detail Modal */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{selectedNotification && getNotificationIcon(selectedNotification.type)}</span>
              {selectedNotification?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">{selectedNotification?.message}</p>
            <p className="text-xs text-muted-foreground/70 mt-4">
              {selectedNotification && getTimeAgo(selectedNotification.created_at)}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
