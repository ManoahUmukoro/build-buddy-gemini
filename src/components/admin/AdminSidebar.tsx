import { NavLink } from 'react-router-dom';
import { 
  Users, 
  Settings, 
  CreditCard, 
  Mail, 
  HelpCircle, 
  LayoutDashboard,
  Shield,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/admin' },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: Shield, label: 'Roles', path: '/admin/roles' },
  { icon: Settings, label: 'App Settings', path: '/admin/settings' },
  { icon: CreditCard, label: 'Billing', path: '/admin/billing' },
  { icon: Mail, label: 'Email', path: '/admin/email' },
  { icon: HelpCircle, label: 'Help Content', path: '/admin/help' },
];

export function AdminSidebar() {
  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">LifeOS Management</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="pt-4 border-t border-border">
        <NavLink
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          Back to App
        </NavLink>
      </div>
    </aside>
  );
}
