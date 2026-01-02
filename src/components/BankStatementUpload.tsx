import { useState, useRef } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { 
  Upload, FileText, Loader2, Check, AlertTriangle, 
  ChevronDown, ChevronUp, Building2
} from 'lucide-react';
import { BankAccount } from '@/hooks/useBankAccounts';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ParsedTransaction {
  date: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category?: string;
  isDuplicate?: boolean;
}

interface BankStatementUploadProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  currency: string;
  onImport: (transactions: ParsedTransaction[], accountId: string) => Promise<void>;
}

export function BankStatementUpload({
  isOpen,
  onClose,
  accounts,
  currency,
  onImport,
}: BankStatementUploadProps) {
  const [step, setStep] = useState<'select' | 'upload' | 'review' | 'importing'>('select');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccountId(accountId);
    setStep('upload');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
    ];

    const extension = file.name.split('.').pop()?.toLowerCase();
    const isAllowed = allowedTypes.includes(file.type) || 
      ['csv', 'xls', 'xlsx', 'pdf'].includes(extension || '');

    if (!isAllowed) {
      toast.error('Please upload a CSV, Excel, or PDF file');
      return;
    }

    setIsUploading(true);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data URL prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Call edge function to parse
      const { data, error } = await supabase.functions.invoke('parse-bank-statement', {
        body: {
          fileContent: base64,
          fileName: file.name,
          fileType: file.type || extension,
          bankAccountId: selectedAccountId,
        },
      });

      if (error) throw error;

      if (data.transactions && data.transactions.length > 0) {
        setParsedTransactions(data.transactions);
        setDuplicateCount(data.duplicateCount || 0);
        setStep('review');
      } else {
        toast.error('No transactions found in the statement');
      }
    } catch (error) {
      console.error('Error parsing statement:', error);
      toast.error('Failed to parse bank statement. Please try a different format.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImport = async () => {
    setStep('importing');
    try {
      await onImport(parsedTransactions, selectedAccountId);
      toast.success(
        `Imported ${parsedTransactions.length} transactions` + 
        (duplicateCount > 0 ? `. ${duplicateCount} duplicates updated.` : '')
      );
      handleClose();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import transactions');
      setStep('review');
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedAccountId('');
    setParsedTransactions([]);
    setDuplicateCount(0);
    setShowAll(false);
    onClose();
  };

  const displayedTransactions = showAll 
    ? parsedTransactions 
    : parsedTransactions.slice(0, 10);

  const totalIncome = parsedTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = parsedTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Import Bank Statement"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Step 1: Select Account */}
        {step === 'select' && (
          <div className="space-y-4 animate-in slide-in-from-right-5">
            <p className="text-sm text-muted-foreground">
              Select the bank account to import transactions into:
            </p>
            <div className="space-y-2">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleAccountSelect(account.id)}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <Building2 className="text-primary shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="font-medium">{account.bank_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.account_type} • {account.currency}
                    </p>
                  </div>
                  {account.is_primary && (
                    <span className="text-[10px] bg-warning/20 text-warning px-2 py-1 rounded font-medium">
                      Primary
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Upload File */}
        {step === 'upload' && (
          <div className="space-y-4 animate-in slide-in-from-right-5">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Building2 size={16} className="text-primary" />
              <span className="text-sm font-medium">{selectedAccount?.bank_name}</span>
            </div>

            <div 
              className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <div className="space-y-2">
                  <Loader2 className="mx-auto animate-spin text-primary" size={40} />
                  <p className="text-sm text-muted-foreground">Parsing statement...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto text-muted-foreground" size={40} />
                  <p className="font-medium">Drop your bank statement here</p>
                  <p className="text-sm text-muted-foreground">
                    Supports PDF, CSV, Excel (XLS, XLSX)
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <Button variant="outline" onClick={() => setStep('select')} className="w-full">
              Back to Account Selection
            </Button>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div className="space-y-4 animate-in slide-in-from-right-5">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Building2 size={16} className="text-primary" />
              <span className="text-sm font-medium">{selectedAccount?.bank_name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {parsedTransactions.length} transactions
              </span>
            </div>

            {duplicateCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm">
                <AlertTriangle size={16} className="text-warning" />
                <span>{duplicateCount} duplicate transactions will be updated</span>
              </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-success/10 p-3 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Total Income</p>
                <p className="font-bold text-success">{formatCurrency(totalIncome, currency)}</p>
              </div>
              <div className="bg-destructive/10 p-3 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="font-bold text-destructive">{formatCurrency(totalExpense, currency)}</p>
              </div>
            </div>

            {/* Transaction List */}
            <div className="max-h-60 overflow-y-auto space-y-1">
              {displayedTransactions.map((t, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    t.isDuplicate ? 'bg-warning/10' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{t.description}</p>
                    <p className="text-xs text-muted-foreground">{t.date}</p>
                  </div>
                  <span className={`font-bold shrink-0 ml-2 ${
                    t.type === 'income' ? 'text-success' : 'text-destructive'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                  </span>
                </div>
              ))}
            </div>

            {parsedTransactions.length > 10 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full flex items-center justify-center gap-1 text-sm text-primary hover:underline"
              >
                {showAll ? (
                  <>Show Less <ChevronUp size={14} /></>
                ) : (
                  <>Show All ({parsedTransactions.length}) <ChevronDown size={14} /></>
                )}
              </button>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleImport} className="flex-1">
                <Check size={16} className="mr-1" />
                Import All
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className="py-8 text-center space-y-4 animate-in fade-in">
            <Loader2 className="mx-auto animate-spin text-primary" size={48} />
            <p className="font-medium">Importing transactions...</p>
            <p className="text-sm text-muted-foreground">
              This may take a moment
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
