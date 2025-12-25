import { useState, useEffect } from 'react';
import { AlertCircle, Wifi, WifiOff, Lock, Server, Settings, X, Trash2, Clock, ChevronRight } from 'lucide-react';
import { ErrorEntry, getRecentErrors, clearErrors, subscribeToErrorCenter } from '@/lib/errorCenter';
import { NetworkErrorType } from '@/lib/networkErrorHandler';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface ErrorCenterPanelProps {
  trigger?: React.ReactNode;
}

function getErrorIcon(type: NetworkErrorType) {
  switch (type) {
    case 'offline':
      return <WifiOff className="h-4 w-4 text-warning" />;
    case 'timeout':
      return <Clock className="h-4 w-4 text-warning" />;
    case 'auth_error':
      return <Lock className="h-4 w-4 text-destructive" />;
    case 'server_error':
      return <Server className="h-4 w-4 text-destructive" />;
    case 'validation_error':
      return <Settings className="h-4 w-4 text-primary" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export function ErrorCenterPanel({ trigger }: ErrorCenterPanelProps) {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setErrors(getRecentErrors());
    const unsubscribe = subscribeToErrorCenter(setErrors);
    return unsubscribe;
  }, []);

  const handleClearAll = () => {
    clearErrors();
    setErrors([]);
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="relative">
      <AlertCircle className="h-4 w-4" />
      {errors.length > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
          {errors.length > 9 ? '9+' : errors.length}
        </span>
      )}
    </Button>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent className="w-[340px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error Center
          </SheetTitle>
          <SheetDescription>
            Recent issues and how to fix them
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-4">
          {errors.length > 0 && (
            <div className="flex justify-end mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            </div>
          )}

          <ScrollArea className="h-[calc(100vh-200px)]">
            {errors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
                  <Wifi className="h-6 w-6 text-success" />
                </div>
                <p className="text-sm font-medium text-foreground">All Clear!</p>
                <p className="text-xs text-muted-foreground mt-1">No recent errors to show</p>
              </div>
            ) : (
              <div className="space-y-2">
                {errors.map((error) => (
                  <div
                    key={error.id}
                    className="p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getErrorIcon(error.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium capitalize text-foreground truncate">
                            {error.type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {getRelativeTime(error.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-foreground mb-1.5 line-clamp-2">
                          {error.context ? `${error.context}: ` : ''}{error.message}
                        </p>
                        <div className="flex items-start gap-1 text-[11px] text-muted-foreground bg-muted/50 p-2 rounded">
                          <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                          <span>{error.suggestedFix}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
