import { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, Check, CheckCheck, ChevronRight, MessageCircle, X } from 'lucide-react';
import { useInboxNotifications, InboxNotification } from '@/hooks/useInboxNotifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function InboxNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<InboxNotification | null>(null);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  
  const { 
    notifications, 
    unreadCount, 
    markAsRead,
    markAllAsRead,
    getTimeAgo,
    getNotificationIcon,
  } = useInboxNotifications();

  // Group notifications by type
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, InboxNotification[]> = {};
    
    notifications.forEach(n => {
      const groupKey = n.type || 'other';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(n);
    });
    
    return groups;
  }, [notifications]);

  const groupLabels: Record<string, string> = {
    broadcast: 'Announcements',
    welcome: 'Welcome',
    reminder: 'Reminders',
    inactivity: 'Activity',
    no_transactions: 'Finance',
    no_tasks_tomorrow: 'Tasks',
    info: 'Updates',
    other: 'Other',
  };

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

  // Swipe-to-dismiss handlers
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwipingId(id);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipingId) return;
    
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);
    
    // Only swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > deltaY && deltaX < 0) {
      setSwipeOffset(Math.max(deltaX, -100));
    }
  };

  const handleTouchEnd = async () => {
    if (swipingId && swipeOffset < -60) {
      // Mark as read on swipe
      await markAsRead(swipingId);
    }
    setSwipingId(null);
    setSwipeOffset(0);
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

  const sortedGroupKeys = Object.keys(groupedNotifications).sort((a, b) => {
    // Sort by most recent notification in each group
    const aLatest = new Date(groupedNotifications[a][0]?.created_at || 0).getTime();
    const bLatest = new Date(groupedNotifications[b][0]?.created_at || 0).getTime();
    return bLatest - aLatest;
  });

  return (
    <>
      <div className="relative" ref={popoverRef}>
        <button
          onClick={handleOpen}
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground relative p-2 transition-colors"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-primary rounded-full text-[10px] text-primary-foreground flex items-center justify-center font-bold animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </button>
        
        {isOpen && (
          <div 
            className="absolute top-full mt-2 right-0 w-80 sm:w-96 bg-card text-card-foreground rounded-2xl shadow-xl border border-border overflow-hidden z-[201]" 
            style={{ maxWidth: 'calc(100vw - 1rem)' }}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-primary" />
                <h4 className="font-bold text-sm">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={requestNotifyPermission}
                  className="text-[10px] text-primary hover:underline font-medium"
                >
                  Enable Push
                </button>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead} 
                    className="text-muted-foreground hover:text-primary flex items-center gap-1 text-[10px] font-medium"
                    title="Mark all as read"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
              </div>
            </div>
            
            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Bell className="text-muted-foreground/50" size={28} />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Important updates will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {sortedGroupKeys.map(groupKey => (
                    <div key={groupKey}>
                      {/* Group Header */}
                      {sortedGroupKeys.length > 1 && (
                        <div className="px-4 py-2 bg-muted/50 sticky top-0">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {groupLabels[groupKey] || groupKey}
                          </span>
                        </div>
                      )}
                      
                      {/* Group Items */}
                      {groupedNotifications[groupKey].map((n) => (
                        <div
                          key={n.id}
                          className="relative overflow-hidden"
                          onTouchStart={(e) => handleTouchStart(e, n.id)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                        >
                          {/* Swipe action background */}
                          <div className="absolute inset-y-0 right-0 w-24 bg-success flex items-center justify-center">
                            <Check size={20} className="text-success-foreground" />
                          </div>
                          
                          {/* Notification item */}
                          <button 
                            onClick={() => handleNotificationClick(n)}
                            className={`w-full flex items-start gap-3 p-4 transition-all text-left relative bg-card ${
                              n.is_read 
                                ? 'hover:bg-muted/50' 
                                : 'bg-primary/5 hover:bg-primary/10'
                            }`}
                            style={{
                              transform: swipingId === n.id ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                              transition: swipingId === n.id ? 'none' : 'transform 0.2s ease-out',
                            }}
                          >
                            <span className="text-xl shrink-0 mt-0.5">{getNotificationIcon(n.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm leading-tight ${n.is_read ? 'text-muted-foreground' : 'text-foreground font-semibold'}`}>
                                  {n.title}
                                </p>
                                {!n.is_read && (
                                  <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {n.message}
                              </p>
                              <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                                {getTimeAgo(n.created_at)}
                              </span>
                            </div>
                            <ChevronRight size={14} className="text-muted-foreground/30 shrink-0 mt-1" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer hint for mobile */}
            {notifications.length > 0 && (
              <div className="p-2 border-t border-border bg-muted/30 text-center sm:hidden">
                <p className="text-[10px] text-muted-foreground">
                  Swipe left to mark as read
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification Detail Modal */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-2xl">{selectedNotification && getNotificationIcon(selectedNotification.type)}</span>
              <span>{selectedNotification?.title}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-muted-foreground leading-relaxed">{selectedNotification?.message}</p>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground/70">
                {selectedNotification && getTimeAgo(selectedNotification.created_at)}
              </span>
              {selectedNotification?.metadata?.action_url && (
                <a 
                  href={selectedNotification.metadata.action_url}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  View Details →
                </a>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
