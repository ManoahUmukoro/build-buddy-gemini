import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="h-14 sm:h-16 bg-card border-b border-border px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="text-base sm:text-lg font-semibold text-foreground">
          Dashboard
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <span className="text-xs sm:text-sm text-muted-foreground hidden md:block truncate max-w-[150px]">
          {user?.email}
        </span>
        <Button variant="ghost" size="sm" onClick={signOut} className="h-9 px-2 sm:px-3">
          <LogOut className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
}
