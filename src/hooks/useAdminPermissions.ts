import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'moderator' | 'user';

interface AdminPermissions {
  role: AppRole | null;
  isAdmin: boolean;
  isModerator: boolean;
  loading: boolean;
  // Permission helpers
  canAccessBilling: boolean;
  canAccessPaymentSettings: boolean;
  canManageAPIKeys: boolean;
  canManageRoles: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canManageHelpContent: boolean;
  canManageEmail: boolean;
}

export function useAdminPermissions(): AdminPermissions {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        } else {
          setRole((data?.role as AppRole) || null);
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchRole();
    }
  }, [user, authLoading]);

  const isAdmin = role === 'admin';
  const isModerator = role === 'moderator';
  const hasAdminAccess = isAdmin || isModerator;

  return {
    role,
    isAdmin,
    isModerator,
    loading: loading || authLoading,
    // Admin-only permissions
    canAccessBilling: isAdmin,
    canAccessPaymentSettings: isAdmin,
    canManageAPIKeys: isAdmin,
    canManageRoles: isAdmin,
    // Admin and moderator permissions
    canManageUsers: hasAdminAccess,
    canManageSettings: hasAdminAccess,
    canManageHelpContent: hasAdminAccess,
    canManageEmail: isAdmin, // Only admin can manage email configuration
  };
}
