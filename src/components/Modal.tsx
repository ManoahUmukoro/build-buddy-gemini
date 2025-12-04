import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-md" }: ModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-foreground/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in">
      <div className={`bg-card rounded-2xl shadow-card w-full ${maxWidth} overflow-hidden flex flex-col max-h-[90vh]`}>
        <div className="p-5 border-b border-border flex justify-between items-center bg-card shrink-0">
          <h3 className="font-bold text-card-foreground text-lg">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground transition-colors bg-muted hover:bg-accent p-2 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
