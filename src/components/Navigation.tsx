import { useState, useEffect } from 'react';
import { Activity, Calendar, Target, DollarSign, Book, Settings, CheckCircle2, HelpCircle, User, Shield, LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TabId, AlertItem } from '@/lib/types';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  alerts?: AlertItem[];
  onClearAlerts?: () => void;
}

interface NavItem {
  id: TabId;
  icon: LucideIcon;
  label: string;
}

const defaultNavItems: NavItem[] = [
  { id: 'dashboard' as TabId, icon: Calendar, label: 'Planner' },
  { id: 'systems' as TabId, icon: Target, label: 'Systems & Goals' },
  { id: 'finance' as TabId, icon: DollarSign, label: 'Finances' },
  { id: 'journal' as TabId, icon: Book, label: 'Journal' },
  { id: 'help' as TabId, icon: HelpCircle, label: 'Help Center' },
  { id: 'profile' as TabId, icon: User, label: 'Profile' },
  { id: 'settings' as TabId, icon: Settings, label: 'Data Vault' },
];

const iconMap: Record<string, LucideIcon> = {
  Calendar,
  Target,
  DollarSign,
  Book,
  HelpCircle,
  User,
  Settings,
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function useNavItems() {
  const [navItems, setNavItems] = useState<NavItem[]>(defaultNavItems);

  useEffect(() => {
    async function fetchNavOrder() {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'ui_layout_config')
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data?.value) {
          const config = data.value as { nav_order?: string[] };
          if (config.nav_order && Array.isArray(config.nav_order)) {
            // Reorder items based on nav_order
            const orderedItems: NavItem[] = [];
            config.nav_order.forEach((id: string) => {
              const item = defaultNavItems.find(i => i.id === id);
              if (item) orderedItems.push(item);
            });
            // Add any items not in the order at the end
            defaultNavItems.forEach(item => {
              if (!orderedItems.find(i => i.id === item.id)) {
                orderedItems.push(item);
              }
            });
            setNavItems(orderedItems);
          }
        }
      } catch (err) {
        console.error('Error fetching nav order:', err);
      }
    }

    fetchNavOrder();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('nav-order-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_settings',
          filter: 'key=eq.ui_layout_config',
        },
        () => {
          fetchNavOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return navItems;
}

export function Sidebar({ activeTab, onTabChange, alerts = [], onClearAlerts }: SidebarProps) {
  const { isAdmin } = useAdminAuth();
  const { profile } = useProfile();
  const greeting = getGreeting();
  const displayName = profile?.display_name;
  const navItems = useNavItems();

  return (
    <aside className="hidden md:flex w-64 bg-sidebar text-sidebar-foreground p-6 flex-col shrink-0 min-h-screen h-full sticky top-0">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tighter flex items-center gap-2">
          <Activity className="text-primary" />
          LifeOS
        </h1>
        <p className="text-sidebar-foreground/60 text-xs mt-1 ml-8">Expert Edition v8.1</p>
        {displayName && (
          <p className="text-sm text-primary mt-3 font-medium">{greeting}, {displayName}!</p>
        )}
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
        <a 
          href="https://webnexer.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] text-sidebar-foreground/40 hover:text-primary text-center block transition-colors"
        >
          Powered by Webnexer
        </a>
      </div>
    </aside>
  );
}


interface MobileHeaderProps {
  alerts?: AlertItem[];
  onClearAlerts?: () => void;
  onProfileClick?: () => void;
}

export function MobileHeader({ alerts = [], onClearAlerts, onProfileClick }: MobileHeaderProps) {
  const { profile } = useProfile();
  const greeting = getGreeting();
  const displayName = profile?.display_name;
  
  return (
    <div className="md:hidden bg-sidebar text-sidebar-foreground p-4 flex items-center justify-between sticky top-0 z-20 shadow-soft">
      <div className="flex flex-col">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Activity className="text-primary" size={18} />
          LifeOS
        </div>
        {displayName && (
          <p className="text-xs text-primary/80 mt-0.5">{greeting}, {displayName}!</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        {onClearAlerts && <NotificationBell alerts={alerts} onClear={onClearAlerts} />}
        <button 
          onClick={onProfileClick}
          className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          <User size={18} className="text-sidebar-foreground/60" />
        </button>
      </div>
    </div>
  );
}

interface MobileNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  const navItems = useNavItems();
  
  // Show main 5 items plus help (excluding profile and settings)
  const mobileNavItems = navItems.filter(item => 
    item.id !== 'profile' && item.id !== 'settings'
  );
  
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border flex justify-around p-2 pb-safe z-40">
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
          <item.icon size={18} />
          <span className="text-[9px] font-semibold mt-0.5 truncate max-w-[50px]">
            {item.id === 'systems' ? 'Goals' : item.label.split(' ')[0]}
          </span>
        </button>
      ))}
    </nav>
  );
}

// Mobile Footer Component
export function MobileFooter() {
  return (
    <footer className="md:hidden bg-muted/50 border-t border-border py-3 px-6 text-center mb-16">
      <p className="text-[10px] text-muted-foreground">
        © {new Date().getFullYear()} LifeOS. All rights reserved.
      </p>
      <a 
        href="https://webnexer.com" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-[10px] text-primary/60 hover:text-primary mt-1 inline-block transition-colors"
      >
        Powered by Webnexer
      </a>
    </footer>
  );
}