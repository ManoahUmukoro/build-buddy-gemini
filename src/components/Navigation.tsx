import { Activity, Calendar, Target, DollarSign, Book, Settings, CheckCircle2, HelpCircle } from 'lucide-react';
import { TabId, AlertItem } from '@/lib/types';
import { NotificationBell } from '@/components/NotificationBell';

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
  { id: 'settings' as TabId, icon: Settings, label: 'Data Vault' },
];

export function Sidebar({ activeTab, onTabChange, alerts = [], onClearAlerts }: SidebarProps) {
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
      </nav>
      
      <div className="pt-6 border-t border-sidebar-border flex items-center justify-between mt-auto">
        <div className="flex items-center gap-3 text-success">
          <CheckCircle2 size={16} />
          <span className="text-sm">System Online</span>
        </div>
        {onClearAlerts && <NotificationBell alerts={alerts} onClear={onClearAlerts} />}
      </div>
    </aside>
  );
}

export function MobileHeader() {
  return (
    <div className="md:hidden bg-sidebar text-sidebar-foreground p-4 flex items-center justify-between sticky top-0 z-20 shadow-soft">
      <div className="flex items-center gap-2 font-bold text-xl">
        <Activity className="text-primary" size={20} />
        LifeOS
      </div>
    </div>
  );
}

export function MobileNav({ activeTab, onTabChange, alerts = [], onClearAlerts }: SidebarProps) {
  // Show only main 5 items in mobile nav (excluding help)
  const mobileNavItems = navItems.filter(item => item.id !== 'help');
  
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border flex justify-around p-3 pb-safe z-40">
      {mobileNavItems.map(item => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={`flex flex-col items-center p-2 rounded-xl transition-all ${
            activeTab === item.id 
              ? 'text-primary bg-primary/10' 
              : 'text-muted-foreground'
          }`}
        >
          <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 2} />
          <span className="text-[10px] font-bold mt-1">
            {item.label.split(' ')[0]}
          </span>
        </button>
      ))}
      {onClearAlerts && (
        <div className="flex flex-col items-center p-2">
          <NotificationBell alerts={alerts} onClear={onClearAlerts} />
        </div>
      )}
    </nav>
  );
}
