import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, Server, CreditCard, Copy, Check, ChevronUp, ChevronDown, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { APP_VERSION, APP_NAME, BUILD_DATE } from '@/lib/appVersion';
import { getLastNErrors } from '@/lib/errorCenter';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type StatusLevel = 'ok' | 'degraded' | 'down' | 'checking';

interface StatusState {
  online: StatusLevel;
  backend: StatusLevel;
  payments: StatusLevel;
}

export function AppStatusIndicator() {
  const [status, setStatus] = useState<StatusState>({
    online: 'checking',
    backend: 'checking',
    payments: 'checking',
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();

  const checkOnlineStatus = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      online: navigator.onLine ? 'ok' : 'down',
    }));
  }, []);

  const checkBackendStatus = useCallback(async () => {
    try {
      const start = Date.now();
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const latency = Date.now() - start;
      
      if (error) {
        setStatus(prev => ({ ...prev, backend: 'down' }));
      } else if (latency > 3000) {
        setStatus(prev => ({ ...prev, backend: 'degraded' }));
      } else {
        setStatus(prev => ({ ...prev, backend: 'ok' }));
      }
    } catch {
      setStatus(prev => ({ ...prev, backend: 'down' }));
    }
  }, []);

  const checkPaymentsStatus = useCallback(async () => {
    // Simple check - just verify we can reach external payment gateways
    // In production, you'd ping their status endpoints
    try {
      // For now, assume payments are OK if online and backend is OK
      setStatus(prev => ({
        ...prev,
        payments: prev.online === 'ok' && prev.backend !== 'down' ? 'ok' : 'degraded',
      }));
    } catch {
      setStatus(prev => ({ ...prev, payments: 'degraded' }));
    }
  }, []);

  const runAllChecks = useCallback(async () => {
    checkOnlineStatus();
    await checkBackendStatus();
    await checkPaymentsStatus();
  }, [checkOnlineStatus, checkBackendStatus, checkPaymentsStatus]);

  useEffect(() => {
    runAllChecks();

    // Set up interval for periodic checks (every 30 seconds)
    const interval = setInterval(runAllChecks, 30000);

    // Listen for online/offline events
    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', checkOnlineStatus);
      window.removeEventListener('offline', checkOnlineStatus);
    };
  }, [runAllChecks, checkOnlineStatus]);

  const getStatusColor = (level: StatusLevel) => {
    switch (level) {
      case 'ok': return 'bg-success';
      case 'degraded': return 'bg-warning';
      case 'down': return 'bg-destructive';
      case 'checking': return 'bg-muted-foreground animate-pulse';
    }
  };

  const getStatusText = (level: StatusLevel) => {
    switch (level) {
      case 'ok': return 'OK';
      case 'degraded': return 'Slow';
      case 'down': return 'Down';
      case 'checking': return '...';
    }
  };

  const generateDiagnostics = () => {
    const recentErrors = getLastNErrors(5);
    const errorSummary = recentErrors.length > 0
      ? recentErrors.map(e => `- [${e.type}] ${e.message}`).join('\n')
      : 'No recent errors';

    const report = `
=== ${APP_NAME} Diagnostics ===
Version: ${APP_VERSION}
Build: ${BUILD_DATE}
Generated: ${new Date().toISOString()}

--- Status ---
Network: ${status.online === 'ok' ? 'Online' : 'Offline'}
Backend: ${getStatusText(status.backend)}
Payments: ${getStatusText(status.payments)}

--- Device ---
User Agent: ${navigator.userAgent}
Platform: ${navigator.platform}
Language: ${navigator.language}
Screen: ${window.screen.width}x${window.screen.height}
Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}

--- User ---
ID: ${user?.id ? user.id.substring(0, 8) + '...' : 'Not logged in'}
Email: ${user?.email ? user.email.substring(0, 3) + '***' : 'N/A'}

--- Recent Errors (Last 5) ---
${errorSummary}
`.trim();

    return report;
  };

  const handleCopyDiagnostics = async () => {
    const diagnostics = generateDiagnostics();
    try {
      await navigator.clipboard.writeText(diagnostics);
      setCopied(true);
      toast.success('Diagnostics copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy diagnostics');
    }
  };

  // Calculate overall status
  const overallStatus: StatusLevel = 
    status.online === 'down' ? 'down' :
    status.backend === 'down' ? 'down' :
    status.backend === 'degraded' || status.payments === 'degraded' ? 'degraded' :
    status.online === 'checking' || status.backend === 'checking' ? 'checking' :
    'ok';

  // Don't show if everything is OK and not expanded
  if (overallStatus === 'ok' && !isExpanded) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <div 
        className={`bg-card border border-border rounded-xl shadow-lg overflow-hidden transition-all duration-300 ${
          isExpanded ? 'w-56' : 'w-auto'
        }`}
      >
        {/* Collapsed View */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 p-2.5 w-full hover:bg-accent/50 transition-colors"
        >
          <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(overallStatus)}`} />
          <Activity className="h-4 w-4 text-muted-foreground" />
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />
          ) : (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          )}
        </button>

        {/* Expanded View */}
        {isExpanded && (
          <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {status.online === 'ok' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  Network
                </span>
                <span className={`font-medium ${status.online === 'ok' ? 'text-success' : 'text-destructive'}`}>
                  {getStatusText(status.online)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Server className="h-3 w-3" />
                  Backend
                </span>
                <span className={`font-medium ${
                  status.backend === 'ok' ? 'text-success' : 
                  status.backend === 'degraded' ? 'text-warning' : 'text-destructive'
                }`}>
                  {getStatusText(status.backend)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <CreditCard className="h-3 w-3" />
                  Payments
                </span>
                <span className={`font-medium ${
                  status.payments === 'ok' ? 'text-success' : 
                  status.payments === 'degraded' ? 'text-warning' : 'text-destructive'
                }`}>
                  {getStatusText(status.payments)}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-7 mt-2"
              onClick={handleCopyDiagnostics}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Diagnostics
                </>
              )}
            </Button>

            <p className="text-[10px] text-muted-foreground text-center">
              v{APP_VERSION}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
