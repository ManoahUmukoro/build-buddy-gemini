import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface AdminRouteProps {
  children: ReactNode;
  requiredPermission?: 'canManageUsers' | 'canManageRoles' | 'canManageSettings' | 'canAccessBilling' | 'canManageEmail' | 'canManageHelpContent';
}

export function AdminRoute({ children, requiredPermission }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const permissions = useAdminPermissions();
  const location = useLocation();

  if (authLoading || permissions.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user has any admin access (admin or moderator)
  const hasAdminAccess = permissions.isAdmin || permissions.isModerator;

  if (!hasAdminAccess) {
    return <Navigate to="/" replace />;
  }

  // If a specific permission is required, check it
  if (requiredPermission && !permissions[requiredPermission]) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center p-6 max-w-md">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this section. This area is restricted to administrators only.
          </p>
          <Link to="/admin">
            <Button variant="outline">Back to Admin Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
