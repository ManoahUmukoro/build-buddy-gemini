import { useAdminSettings } from '@/hooks/useAdminSettings';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { AlertTriangle, Loader2 } from 'lucide-react';

export function MaintenanceBanner() {
  const { isMaintenanceMode, maintenanceMessage, loading: settingsLoading } = useAdminSettings();
  const { isAdmin, loading: permissionsLoading } = useAdminPermissions();

  // Don't show anything while loading
  if (settingsLoading || permissionsLoading) {
    return null;
  }

  // Admins bypass maintenance mode
  if (isAdmin) {
    return null;
  }

  // Not in maintenance mode
  if (!isMaintenanceMode) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Under Maintenance</h1>
        <p className="text-muted-foreground">
          {maintenanceMessage || 'We are currently performing maintenance. Please check back soon.'}
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          We apologize for any inconvenience.
        </p>
      </div>
    </div>
  );
}
