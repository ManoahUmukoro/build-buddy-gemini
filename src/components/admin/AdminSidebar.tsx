import { NavLink } from 'react-router-dom';
import { 
  Users, 
  Settings, 
  CreditCard, 
  Mail, 
  HelpCircle, 
  LayoutDashboard,
  Shield,
  Home,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

interface AdminSidebarProps {
  onClose?: () => void;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  permission?: 'canManageUsers' | 'canManageRoles' | 'canManageSettings' | 'canAccessBilling' | 'canManageEmail' | 'canManageHelpContent';
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Overview', path: '/admin' },
  { icon: Users, label: 'Users', path: '/admin/users', permission: 'canManageUsers' },
  { icon: Shield, label: 'Roles', path: '/admin/roles', permission: 'canManageRoles' },
  { icon: Settings, label: 'App Settings', path: '/admin/settings', permission: 'canManageSettings' },
  { icon: CreditCard, label: 'Billing', path: '/admin/billing', permission: 'canAccessBilling' },
  { icon: Mail, label: 'Email', path: '/admin/email', permission: 'canManageEmail' },
  { icon: HelpCircle, label: 'Help Content', path: '/admin/help', permission: 'canManageHelpContent' },
];

export function AdminSidebar({ onClose }: AdminSidebarProps) {
  const permissions = useAdminPermissions();

  const hasPermission = (permission?: NavItem['permission']): boolean => {
    if (!permission) return true;
    return permissions[permission] ?? false;
  };

  return (
    <aside className="w-64 bg-card border-r border-border h-screen p-4 flex flex-col sticky top-0">
      <div className="mb-6 pt-2">
        <h1 className="text-lg lg:text-xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-xs lg:text-sm text-muted-foreground">LifeOS Management</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const allowed = hasPermission(item.permission);
          
          if (!allowed) {
            return (
              <div
                key={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
                title="You don't have permission to access this section"
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate flex-1">{item.label}</span>
                <Lock className="h-3 w-3" />
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-border">
        <NavLink
          to="/"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Home className="h-4 w-4 flex-shrink-0" />
          <span>Back to App</span>
        </NavLink>
      </div>
    </aside>
  );
}
