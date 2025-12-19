import { ReactNode } from 'react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { UpgradePrompt } from './UpgradePrompt';

interface FeatureGateProps {
  feature: 'ai_chat' | 'receipt_scanning' | 'auto_categorize' | 'habit_suggestions' | 'exports' | 'daily_digest' | 'weekly_digest';
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { 
    loading,
    canUseAI, 
    canScanReceipts, 
    canAutoCategorize, 
    canUseHabitSuggestions,
    canExport,
    canReceiveDailyDigest,
    canReceiveWeeklyDigest,
    isPro
  } = useEntitlements();

  if (loading) {
    return null;
  }

  const featureMap: Record<string, boolean> = {
    ai_chat: canUseAI,
    receipt_scanning: canScanReceipts,
    auto_categorize: canAutoCategorize,
    habit_suggestions: canUseHabitSuggestions,
    exports: canExport,
    daily_digest: canReceiveDailyDigest,
    weekly_digest: canReceiveWeeklyDigest,
  };

  const hasAccess = featureMap[feature] ?? false;

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt && !isPro) {
    return <UpgradePrompt feature={feature} />;
  }

  return null;
}
