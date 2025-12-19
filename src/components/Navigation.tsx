import { Activity, Calendar, Target, DollarSign, Book, Settings, CheckCircle2, HelpCircle, User, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TabId, AlertItem } from '@/lib/types';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  alerts?: AlertItem[];
  onClearAlerts?: () => void;
}

const navItems = [
  { id: 'dashboard' as TabId, icon: Calendar, label: 'Planner' },
  { id: 'systems' as TabId, icon: Target, label: 'Systems & Goals' },
  { id: 'finance' as TabId, icon: DollarSign, label: 'Finances' },
  { id: 'journal' as TabId, icon: Book, label: 'Journal' },
  { id: 'help' as TabId, icon: HelpCircle, label: 'Help Center' },
  { id: 'profile' as TabId, icon: User, label: 'Profile' },
  { id: 'settings' as TabId, icon: Settings, label: 'Data Vault' },
];

export function Sidebar({ activeTab, onTabChange, alerts = [], onClearAlerts }: SidebarProps) {
  const { isAdmin } = useAdminAuth();

  return (
    <aside className="hidden md:flex w-64 bg-sidebar text-sidebar-foreground p-6 flex-col shrink-0 min-h-screen h-full sticky top-0">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tighter flex items-center gap-2">
          <Activity className="text-primary" />
          LifeOS
        </h1>
        <p className="text-sidebar-foreground/60 text-xs mt-1 ml-8">Expert Edition v8.1</p>
      </div>
      
      <nav className="space-y-2 flex-1 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === item.id 
                ? 'bg-primary text-primary-foreground shadow-glow' 
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}

        {isAdmin && (
          <Link
            to="/admin"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sidebar-foreground/60 hover:bg-sidebar-accent mt-4 border-t border-sidebar-border pt-6"
          >
            <Shield size={20} />
            <span className="font-medium">Admin Panel</span>
          </Link>
        )}
      </nav>
      
      <div className="pt-6 border-t border-sidebar-border mt-auto space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-success">
            <CheckCircle2 size={16} />
            <span className="text-sm">System Online</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {onClearAlerts && <NotificationBell alerts={alerts} onClear={onClearAlerts} />}
          </div>
        </div>
        <p className="text-[10px] text-sidebar-foreground/40 text-center">Powered by Webnexer</p>
      </div>
    </aside>
  );
}

interface MobileHeaderProps {
  alerts?: AlertItem[];
  onClearAlerts?: () => void;
}

export function MobileHeader({ alerts = [], onClearAlerts }: MobileHeaderProps) {
  return (
    <div className="md:hidden bg-sidebar text-sidebar-foreground p-4 flex items-center justify-between sticky top-0 z-20 shadow-soft">
      <div className="flex items-center gap-2 font-bold text-lg">
        <Activity className="text-primary" size={18} />
        LifeOS
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        {onClearAlerts && <NotificationBell alerts={alerts} onClear={onClearAlerts} />}
      </div>
    </div>
  );
}

export function MobileNav({ activeTab, onTabChange }: Omit<SidebarProps, 'alerts' | 'onClearAlerts'>) {
  // Show only main 5 items in mobile nav (excluding help and profile)
  const mobileNavItems = navItems.filter(item => item.id !== 'help' && item.id !== 'profile');
  
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border flex justify-around p-2 pb-safe z-40">
      {mobileNavItems.map(item => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={`flex flex-col items-center p-1.5 rounded-xl transition-all ${
            activeTab === item.id 
              ? 'text-primary bg-primary/10' 
              : 'text-muted-foreground'
          }`}
        >
          <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
          <span className="text-[9px] font-semibold mt-0.5">
            {item.label.split(' ')[0]}
          </span>
        </button>
      ))}
    </nav>
  );
}
