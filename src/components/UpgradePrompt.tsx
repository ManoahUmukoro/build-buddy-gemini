import { Crown, Sparkles, Receipt, Wand2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface UpgradePromptProps {
  feature: string;
  compact?: boolean;
}

// Only AI features are Pro-locked
const featureLabels: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  ai_chat: {
    label: 'AI Chat',
    icon: Sparkles,
    description: 'Get AI-powered insights and assistance',
  },
  receipt_scanning: {
    label: 'Receipt Scanning',
    icon: Receipt,
    description: 'Automatically extract transaction data from receipts with AI',
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
};

export function UpgradePrompt({ feature, compact = false }: UpgradePromptProps) {
  const featureInfo = featureLabels[feature] || {
    label: 'AI Feature',
    icon: Sparkles,
    description: 'Upgrade to Pro to unlock AI-powered features',
  };

  const Icon = featureInfo.icon;

  if (compact) {
    return (
      <Link to="/pricing">
        <Button variant="outline" size="sm" className="gap-2 text-xs">
          <Sparkles size={14} className="text-purple-500" />
          Unlock with Pro
        </Button>
      </Link>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-primary/5 border border-purple-500/20 rounded-xl p-6 text-center space-y-4">
      <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto">
        <Icon className="text-purple-500" size={24} />
      </div>
      <div>
        <h3 className="font-semibold text-foreground flex items-center justify-center gap-2">
          <Sparkles className="text-purple-500" size={18} />
          {featureInfo.label} - Pro Feature
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {featureInfo.description}
        </p>
      </div>
      <Link to="/pricing">
        <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
          <Sparkles size={16} />
          Upgrade to Pro
        </Button>
      </Link>
    </div>
  );
}
