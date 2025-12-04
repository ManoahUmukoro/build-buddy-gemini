import { Check, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export const SaveIndicator = ({ status, className }: SaveIndicatorProps) => {
  if (status === 'idle') return null;

  return (
    <div
      className={cn(
        'fixed bottom-20 right-4 md:bottom-4 flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-lg z-50',
        status === 'saving' && 'bg-muted text-muted-foreground',
        status === 'saved' && 'bg-green-500/20 text-green-600 dark:text-green-400',
        status === 'error' && 'bg-destructive/20 text-destructive',
        className
      )}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-4 w-4" />
          <span>Saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <CloudOff className="h-4 w-4" />
          <span>Save failed</span>
        </>
      )}
    </div>
  );
};
