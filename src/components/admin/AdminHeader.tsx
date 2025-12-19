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
    <header className="h-16 bg-card border-b border-border px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground hidden sm:block">
          Dashboard
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <span className="text-sm text-muted-foreground hidden sm:block">
          {user?.email}
        </span>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
}
