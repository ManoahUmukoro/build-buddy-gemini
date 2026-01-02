import { FileUp, Receipt, PenLine } from 'lucide-react';

interface TransactionSourceBadgeProps {
  source?: 'manual' | 'receipt' | 'bank_import' | null;
  size?: 'sm' | 'md';
}

const sourceConfig = {
  manual: {
    icon: PenLine,
    label: 'Manual',
    className: 'bg-muted text-muted-foreground',
  },
  receipt: {
    icon: Receipt,
    label: 'Receipt',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  bank_import: {
    icon: FileUp,
    label: 'Import',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
};

export function TransactionSourceBadge({ source, size = 'sm' }: TransactionSourceBadgeProps) {
  const effectiveSource = source || 'manual';
  const config = sourceConfig[effectiveSource];
  const Icon = config.icon;
  
  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-1.5 py-0.5 gap-0.5' 
    : 'text-xs px-2 py-1 gap-1';
  
  const iconSize = size === 'sm' ? 10 : 12;
  
  return (
    <span 
      className={`inline-flex items-center rounded-full font-medium ${config.className} ${sizeClasses}`}
      title={`Source: ${config.label}`}
    >
      <Icon size={iconSize} />
      <span className="hidden sm:inline">{config.label}</span>
    </span>
  );
}
