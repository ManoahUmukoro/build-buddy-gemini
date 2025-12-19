import { Crown, Sparkles, Receipt, Wand2, Target, Download, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface UpgradePromptProps {
  feature: string;
  compact?: boolean;
}

const featureLabels: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  ai_chat: {
    label: 'AI Chat',
    icon: Sparkles,
    description: 'Get AI-powered insights and assistance',
  },
  receipt_scanning: {
    label: 'Receipt Scanning',
    icon: Receipt,
    description: 'Automatically extract transaction data from receipts',
  },
  auto_categorize: {
    label: 'Auto-Categorize',
    icon: Wand2,
    description: 'Let AI categorize your expenses automatically',
  },
  habit_suggestions: {
    label: 'Habit Suggestions',
    icon: Target,
    description: 'Get AI-generated habit recommendations',
  },
  exports: {
    label: 'Data Exports',
    icon: Download,
    description: 'Export your data for backup or analysis',
  },
  daily_digest: {
    label: 'Daily Digest',
    icon: Mail,
    description: 'Receive daily summary emails',
  },
  weekly_digest: {
    label: 'Weekly Digest',
    icon: Mail,
    description: 'Receive weekly check-in emails',
  },
};

export function UpgradePrompt({ feature, compact = false }: UpgradePromptProps) {
  const featureInfo = featureLabels[feature] || {
    label: 'Pro Feature',
    icon: Crown,
    description: 'Upgrade to access this feature',
  };

  const Icon = featureInfo.icon;

  if (compact) {
    return (
      <Link to="/pricing">
        <Button variant="outline" size="sm" className="gap-2 text-xs">
          <Crown size={14} className="text-yellow-500" />
          Upgrade to Pro
        </Button>
      </Link>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-6 text-center space-y-4">
      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
        <Icon className="text-primary" size={24} />
      </div>
      <div>
        <h3 className="font-semibold text-foreground flex items-center justify-center gap-2">
          <Crown className="text-yellow-500" size={18} />
          {featureInfo.label} - Pro Feature
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {featureInfo.description}
        </p>
      </div>
      <Link to="/pricing">
        <Button className="gap-2">
          <Crown size={16} />
          Upgrade to Pro
        </Button>
      </Link>
    </div>
  );
}
