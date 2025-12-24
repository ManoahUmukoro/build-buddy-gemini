import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/Modal';
import { Receipt, Check, X, Edit2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface ReceiptItem {
  description: string;
  amount: number;
  category: string;
}

interface ScannedReceipt {
  vendor: string;
  total: number;
  date: string;
  items: ReceiptItem[];
  confidence?: number;
}

interface ReceiptReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedData: ScannedReceipt | null;
  categories: string[];
  currency: string;
  onConfirm: (data: {
    type: 'expense';
    amount: number;
    description: string;
    category: string;
    date: string;
  }) => void;
}

export function ReceiptReviewModal({
  isOpen,
  onClose,
  scannedData,
  categories,
  currency,
  onConfirm,
}: ReceiptReviewModalProps) {
  const [editedData, setEditedData] = useState({
    amount: scannedData?.total || 0,
    description: scannedData?.vendor || 'Scanned Receipt',
    category: scannedData?.items?.[0]?.category || categories[0] || 'Other',
    date: scannedData?.date || new Date().toISOString().split('T')[0],
  });

  // Update when scannedData changes
  useState(() => {
    if (scannedData) {
      setEditedData({
        amount: scannedData.total || 0,
        description: scannedData.vendor || 'Scanned Receipt',
        category: scannedData.items?.[0]?.category || categories[0] || 'Other',
        date: scannedData.date || new Date().toISOString().split('T')[0],
      });
    }
  });

  if (!scannedData) return null;

  const confidence = scannedData.confidence || 0.8;
  const isLowConfidence = confidence < 0.7;

  const handleConfirm = () => {
    onConfirm({
      type: 'expense',
      amount: editedData.amount,
      description: editedData.description,
      category: editedData.category,
      date: editedData.date,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Scanned Receipt" maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Confidence Warning */}
        {isLowConfidence && (
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning">
            <AlertTriangle size={18} />
            <span>Low confidence scan. Please verify the details below.</span>
          </div>
        )}

        {/* Receipt Preview */}
        <div className="bg-muted/50 p-4 rounded-lg border border-border space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Receipt size={16} />
            Scanned Data
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <Label htmlFor="amount" className="text-xs">Amount</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={editedData.amount}
                onChange={(e) => setEditedData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="text-lg font-bold pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {currency}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="description" className="text-xs">Description / Vendor</Label>
            <Input
              id="description"
              value={editedData.description}
              onChange={(e) => setEditedData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label htmlFor="category" className="text-xs">Category</Label>
            <select
              id="category"
              value={editedData.category}
              onChange={(e) => setEditedData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label htmlFor="date" className="text-xs">Date</Label>
            <Input
              id="date"
              type="date"
              value={editedData.date}
              onChange={(e) => setEditedData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          {/* Items Preview */}
          {scannedData.items && scannedData.items.length > 1 && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground mb-2">
                {scannedData.items.length} items detected
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {scannedData.items.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                    <span className="truncate flex-1">{item.description}</span>
                    <span className="font-medium ml-2">{formatCurrency(item.amount, currency)}</span>
                  </div>
                ))}
                {scannedData.items.length > 5 && (
                  <div className="text-xs text-muted-foreground italic">
                    +{scannedData.items.length - 5} more items
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
          <span className="text-sm text-muted-foreground">Total to save:</span>
          <span className="text-xl font-bold text-primary">
            {formatCurrency(editedData.amount, currency)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            <X size={16} className="mr-2" />
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="flex-1">
            <Check size={16} className="mr-2" />
            Confirm & Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
