import { Settings, Download, Upload } from 'lucide-react';

interface SettingsTabProps {
  onBackup: () => void;
  onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function SettingsTab({ onBackup, onRestore }: SettingsTabProps) {
  return (
    <div className="max-w-2xl mx-auto bg-card p-10 rounded-3xl shadow-card border border-border text-center mt-10">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Settings className="text-muted-foreground" size={32} />
      </div>
      <h3 className="text-2xl font-bold text-card-foreground mb-2">Data Vault</h3>
      <p className="text-muted-foreground mb-10 max-w-sm mx-auto">
        Your data is safely stored on this device. Use these tools to move it to another device.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button 
          onClick={onBackup} 
          className="flex flex-col items-center justify-center p-8 border-2 border-border rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group bg-muted/50"
        >
          <div className="w-14 h-14 bg-card rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-soft text-primary">
            <Download size={24} />
          </div>
          <span className="font-bold text-card-foreground">Backup Data</span>
          <span className="text-xs text-muted-foreground mt-1">Download JSON file</span>
        </button>
        
        <label className="flex flex-col items-center justify-center p-8 border-2 border-border rounded-2xl hover:border-success hover:bg-success/5 transition-all group cursor-pointer bg-muted/50">
          <div className="w-14 h-14 bg-card rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-soft text-success">
            <Upload size={24} />
          </div>
          <span className="font-bold text-card-foreground">Restore Data</span>
          <span className="text-xs text-muted-foreground mt-1">Upload JSON file</span>
          <input type="file" accept=".json" onChange={onRestore} className="hidden" />
        </label>
      </div>
    </div>
  );
}
