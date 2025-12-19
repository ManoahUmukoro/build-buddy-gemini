import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PlanFeatures {
  ai_chat: boolean;
  receipt_scanning: boolean;
  auto_categorize: boolean;
  daily_digest: boolean;
  weekly_digest: boolean;
  max_systems: number;
  max_transactions: number;
  exports: boolean;
  habit_suggestions: boolean;
}

interface GlobalFeatures {
  ai_chat: boolean;
  receipt_scanning: boolean;
  auto_categorize: boolean;
  habit_suggestions: boolean;
}

interface GlobalNotifications {
  email_enabled: boolean;
  task_reminders: boolean;
  weekly_digest: boolean;
  daily_digest: boolean;
  welcome_emails: boolean;
}

interface Entitlements {
  loading: boolean;
  isPro: boolean;
  userPlan: string;
  planStatus: string;
  // Feature access (combines global toggle + plan entitlement)
  canUseAI: boolean;
  canScanReceipts: boolean;
  canAutoCategorize: boolean;
  canUseHabitSuggestions: boolean;
  canExport: boolean;
  canReceiveDailyDigest: boolean;
  canReceiveWeeklyDigest: boolean;
  // Limits
  maxSystems: number;
  maxTransactions: number;
  // Helpers
  isFeatureEnabled: (feature: keyof PlanFeatures) => boolean;
  isGlobalFeatureEnabled: (feature: keyof GlobalFeatures) => boolean;
  refetch: () => Promise<void>;
}

export function useEntitlements(): Entitlements {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [planStatus, setPlanStatus] = useState<string>('active');
  const [planFeatures, setPlanFeatures] = useState<Record<string, PlanFeatures> | null>(null);
  const [globalFeatures, setGlobalFeatures] = useState<GlobalFeatures | null>(null);
  const [globalNotifications, setGlobalNotifications] = useState<GlobalNotifications | null>(null);

  const fetchEntitlements = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch user plan, global features, plan features, and notifications in parallel
      const [userPlanRes, settingsRes] = await Promise.all([
        supabase
          .from('user_plans')
          .select('plan, status')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('admin_settings')
          .select('key, value')
          .in('key', ['features', 'plan_features', 'notifications'])
      ]);

      if (userPlanRes.error) {
        console.error('Error fetching user plan:', userPlanRes.error);
      } else if (userPlanRes.data) {
        setUserPlan(userPlanRes.data.plan || 'free');
        setPlanStatus(userPlanRes.data.status || 'active');
      }

      if (settingsRes.error) {
        console.error('Error fetching admin settings:', settingsRes.error);
      } else if (settingsRes.data) {
        settingsRes.data.forEach(setting => {
          const value = typeof setting.value === 'string' 
            ? JSON.parse(setting.value) 
            : setting.value;
          
          if (setting.key === 'features') {
            setGlobalFeatures(value);
          } else if (setting.key === 'plan_features') {
            setPlanFeatures(value);
          } else if (setting.key === 'notifications') {
            setGlobalNotifications(value);
          }
        });
      }
    } catch (err) {
      console.error('Error fetching entitlements:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchEntitlements();
    }
  }, [authLoading, fetchEntitlements]);

  // Subscribe to real-time admin_settings changes
  useEffect(() => {
    const channel = supabase
      .channel('entitlements-settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_settings',
        },
        () => {
          fetchEntitlements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEntitlements]);

  // Subscribe to real-time user_plans changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('entitlements-user-plan')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_plans',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchEntitlements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchEntitlements]);

  const isPro = userPlan === 'pro' && planStatus === 'active';
  const currentPlanFeatures = planFeatures?.[userPlan] || planFeatures?.free;

  // Helper to check if a feature is enabled for the current plan
  const isFeatureEnabled = (feature: keyof PlanFeatures): boolean => {
    if (!currentPlanFeatures) return false;
    return !!currentPlanFeatures[feature];
  };

  // Helper to check if a global feature toggle is enabled
  const isGlobalFeatureEnabled = (feature: keyof GlobalFeatures): boolean => {
    if (!globalFeatures) return false;
    return !!globalFeatures[feature];
  };

  // Combine global toggles with plan entitlements
  const canUseAI = isGlobalFeatureEnabled('ai_chat') && isFeatureEnabled('ai_chat');
  const canScanReceipts = isGlobalFeatureEnabled('receipt_scanning') && isFeatureEnabled('receipt_scanning');
  const canAutoCategorize = isGlobalFeatureEnabled('auto_categorize') && isFeatureEnabled('auto_categorize');
  const canUseHabitSuggestions = isGlobalFeatureEnabled('habit_suggestions') && isFeatureEnabled('habit_suggestions');
  const canExport = isFeatureEnabled('exports');
  
  // Digest emails also check notification toggles
  const canReceiveDailyDigest = 
    (globalNotifications?.email_enabled ?? false) && 
    (globalNotifications?.daily_digest ?? false) && 
    isFeatureEnabled('daily_digest');
  
  const canReceiveWeeklyDigest = 
    (globalNotifications?.email_enabled ?? false) && 
    (globalNotifications?.weekly_digest ?? false) && 
    isFeatureEnabled('weekly_digest');

  return {
    loading: loading || authLoading,
    isPro,
    userPlan,
    planStatus,
    canUseAI,
    canScanReceipts,
    canAutoCategorize,
    canUseHabitSuggestions,
    canExport,
    canReceiveDailyDigest,
    canReceiveWeeklyDigest,
    maxSystems: currentPlanFeatures?.max_systems ?? 3,
    maxTransactions: currentPlanFeatures?.max_transactions ?? 50,
    isFeatureEnabled,
    isGlobalFeatureEnabled,
    refetch: fetchEntitlements,
  };
}
