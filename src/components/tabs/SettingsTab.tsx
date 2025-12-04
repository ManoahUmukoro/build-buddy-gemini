import { useState } from 'react';
import { Settings, Download, Upload, Key, Check, X, Eye, EyeOff, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface SettingsTabProps {
  onBackup: () => void;
  onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
  geminiApiKey: string;
  onSaveApiKey: (key: string) => void;
}

export function SettingsTab({ onBackup, onRestore, geminiApiKey, onSaveApiKey }: SettingsTabProps) {
  const { user, signOut } = useAuth();
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveApiKey = async () => {
    setIsSaving(true);
    try {
      await onSaveApiKey(apiKeyInput);
      toast.success('API key saved successfully');
    } catch (error) {
      toast.error('Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setIsSaving(true);
    try {
      await onSaveApiKey('');
      setApiKeyInput('');
      toast.success('API key removed');
    } catch (error) {
      toast.error('Failed to remove API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  const isConnected = !!geminiApiKey;

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6 px-2 md:px-0 mt-4 md:mt-10 pb-20 md:pb-0">
      {/* User Info */}
      {user && (
        <div className="bg-card p-6 rounded-3xl shadow-card border border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-card-foreground">Account</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut size={16} />
              Sign Out
            </Button>
          </div>
        </div>
      )}

      {/* AI Configuration */}
      <div className="bg-card p-4 md:p-8 rounded-3xl shadow-card border border-border">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Key className="text-primary" size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base md:text-xl font-bold text-card-foreground">Gemini AI</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Connect your Gemini API key for AI features</p>
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? 'bg-success' : 'bg-muted-foreground'}`} />
            <span className={isConnected ? 'text-success' : 'text-muted-foreground'}>
              {isConnected ? 'Connected' : 'Not connected'}
            </span>
          </div>

          <div className="relative">
            <Input
              type={showApiKey ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="pr-10 h-10 md:h-12 bg-muted border-0 rounded-xl text-sm"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSaveApiKey}
              disabled={isSaving || !apiKeyInput || apiKeyInput === geminiApiKey}
              className="flex-1 gap-2 h-10 md:h-11 text-sm"
            >
              <Check size={14} />
              Save Key
            </Button>
            {isConnected && (
              <Button
                variant="outline"
                onClick={handleRemoveApiKey}
                disabled={isSaving}
                className="gap-2 h-10 md:h-11 text-sm"
              >
                <X size={14} />
                Remove
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground bg-muted p-2.5 md:p-3 rounded-lg">
            💡 Get your free API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>. AI features require a valid Gemini API key.
          </p>
        </div>
      </div>

      {/* Data Vault */}
      <div className="bg-card p-6 md:p-10 rounded-3xl shadow-card border border-border text-center">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
          <Settings className="text-muted-foreground" size={24} />
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-card-foreground mb-2">Data Vault</h3>
        <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-10 max-w-sm mx-auto">
          Your data is stored securely in the cloud. Use these tools to export or import your data.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <button 
            onClick={onBackup} 
            className="flex flex-col items-center justify-center p-5 md:p-8 border-2 border-border rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group bg-muted/50"
          >
            <div className="w-10 h-10 md:w-14 md:h-14 bg-card rounded-full flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform shadow-soft text-primary">
              <Download size={20} className="md:w-6 md:h-6" />
            </div>
            <span className="font-bold text-card-foreground text-sm md:text-base">Backup Data</span>
            <span className="text-xs text-muted-foreground mt-1">Download JSON file</span>
          </button>
          
          <label className="flex flex-col items-center justify-center p-5 md:p-8 border-2 border-border rounded-2xl hover:border-success hover:bg-success/5 transition-all group cursor-pointer bg-muted/50">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-card rounded-full flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform shadow-soft text-success">
              <Upload size={20} className="md:w-6 md:h-6" />
            </div>
            <span className="font-bold text-card-foreground text-sm md:text-base">Restore Data</span>
            <span className="text-xs text-muted-foreground mt-1">Upload JSON file</span>
            <input type="file" accept=".json" onChange={onRestore} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
}
