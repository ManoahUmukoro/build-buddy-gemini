import { ReactNode, useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <AdminSidebar />
      </div>

      {/* Mobile/Tablet Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile/Tablet Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 max-w-[80vw] transform transition-transform duration-300 ease-in-out lg:hidden bg-card',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="relative h-full overflow-y-auto">
          <AdminSidebar onClose={() => setSidebarOpen(false)} />
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-3 right-3 p-2 rounded-full bg-muted hover:bg-accent transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
