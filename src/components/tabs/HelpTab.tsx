import { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Info, Loader2, FileText, MessageCircle, Mail, Copy, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AnnouncementTicker } from '@/components/AnnouncementTicker';
import { ErrorCenterPanel } from '@/components/ErrorCenterPanel';
import { APP_VERSION, APP_NAME, BUILD_DATE } from '@/lib/appVersion';
import { getLastNErrors, getErrorCount } from '@/lib/errorCenter';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface FaqItemProps {
  question: string;
  answer: React.ReactNode;
}

function FaqItem({ question, answer }: FaqItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex justify-between items-center py-4 text-left font-medium text-card-foreground hover:text-primary transition-colors"
      >
        {question}
        {isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
      </button>
      {isOpen && (
        <div className="pb-4 text-sm text-muted-foreground leading-relaxed animate-in slide-in-from-top-1">
          {answer}
        </div>
      )}
    </div>
  );
}

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  order_index: number;
}

export function HelpTab() {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const errorCount = getErrorCount();

  useEffect(() => {
    async function fetchArticles() {
      try {
        const { data, error } = await supabase
          .from('help_content')
          .select('*')
          .eq('is_published', true)
          .order('category')
          .order('order_index');

        if (error) throw error;
        setArticles(data || []);
      } catch (err) {
        console.error('Error fetching help articles:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchArticles();
  }, []);

  // Group articles by category
  const articlesByCategory = articles.reduce((acc, article) => {
    if (!acc[article.category]) {
      acc[article.category] = [];
    }
    acc[article.category].push(article);
    return acc;
  }, {} as Record<string, HelpArticle[]>);

  const handleOpenLiveChat = () => {
    const tawkStatus = (window as any).__tawkStatus;
    const Tawk_API = (window as any).Tawk_API;

    if (tawkStatus === 'ready' && Tawk_API) {
      if (typeof Tawk_API.maximize === 'function') {
        Tawk_API.maximize();
      } else if (typeof Tawk_API.toggle === 'function') {
        Tawk_API.toggle();
      } else if (typeof Tawk_API.popup === 'function') {
        Tawk_API.popup();
      }
    } else if (tawkStatus === 'loading') {
      toast.info('Support chat is loading...', {
        description: 'Please wait a moment and try again.',
        action: {
          label: 'Open in Browser',
          onClick: () => window.open('https://tawk.to/chat/694c8271477298197c6e1229/1jd9dr3dp', '_blank'),
        },
      });
    } else {
      toast.warning('Support chat unavailable', {
        description: 'It may be blocked by your browser or network.',
        action: {
          label: 'Open in Browser',
          onClick: () => window.open('https://tawk.to/chat/694c8271477298197c6e1229/1jd9dr3dp', '_blank'),
        },
      });
    }
  };

  const handleEmailSupport = () => {
    const subject = encodeURIComponent(`${APP_NAME} Support Request`);
    const body = encodeURIComponent(`Hi Support Team,\n\nI need help with:\n\n[Describe your issue here]\n\n---\nApp Version: ${APP_VERSION}\nUser ID: ${user?.id?.substring(0, 8) || 'Not logged in'}...\n`);
    window.location.href = `mailto:support@webnexer.com?subject=${subject}&body=${body}`;
  };

  const generateDiagnostics = () => {
    const recentErrors = getLastNErrors(5);
    const errorSummary = recentErrors.length > 0
      ? recentErrors.map(e => `- [${e.type}] ${e.context || ''}: ${e.message}`).join('\n')
      : 'No recent errors';

    return `
=== ${APP_NAME} Diagnostics ===
Version: ${APP_VERSION}
Build: ${BUILD_DATE}
Generated: ${new Date().toISOString()}

--- Status ---
Network: ${navigator.onLine ? 'Online' : 'Offline'}
Connection: ${(navigator as any).connection?.effectiveType || 'Unknown'}

--- Device ---
User Agent: ${navigator.userAgent}
Platform: ${navigator.platform}
Language: ${navigator.language}
Screen: ${window.screen.width}x${window.screen.height}
Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}

--- User ---
ID: ${user?.id ? user.id.substring(0, 8) + '...' : 'Not logged in'}
Email: ${user?.email ? user.email.substring(0, 3) + '***@***' : 'N/A'}

--- Recent Errors (Last 5) ---
${errorSummary}
`.trim();
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

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">
      {/* Announcements Ticker */}
      <AnnouncementTicker />

      <div className="bg-primary text-primary-foreground p-8 rounded-2xl shadow-lg mb-8">
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <HelpCircle size={32}/> LifeOS Help Center
        </h2>
        <p className="text-primary-foreground/80">Your complete guide to mastering LifeOS - your personal command center for productivity, finance, and growth.</p>
      </div>

      {/* Contact Support Section */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-soft">
        <h3 className="font-bold text-lg text-card-foreground mb-4 flex items-center gap-2">
          <MessageCircle size={20} className="text-primary"/> Contact Support
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Live Chat */}
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/5 hover:border-primary/30"
            onClick={handleOpenLiveChat}
          >
            <MessageCircle className="h-6 w-6 text-primary" />
            <span className="font-medium">Live Chat</span>
            <span className="text-xs text-muted-foreground">Talk to us now</span>
          </Button>

          {/* Email Support */}
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/5 hover:border-primary/30"
            onClick={handleEmailSupport}
          >
            <Mail className="h-6 w-6 text-primary" />
            <span className="font-medium">Email Support</span>
            <span className="text-xs text-muted-foreground">support@webnexer.com</span>
          </Button>

          {/* Copy Diagnostics */}
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/5 hover:border-primary/30"
            onClick={handleCopyDiagnostics}
          >
            {copied ? <Check className="h-6 w-6 text-success" /> : <Copy className="h-6 w-6 text-primary" />}
            <span className="font-medium">{copied ? 'Copied!' : 'Copy Diagnostics'}</span>
            <span className="text-xs text-muted-foreground">For faster support</span>
          </Button>
        </div>

        {/* Error Center Quick Access */}
        {errorCount > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <ErrorCenterPanel
              trigger={
                <Button variant="ghost" className="w-full justify-between text-sm text-muted-foreground hover:text-foreground">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    {errorCount} recent error{errorCount !== 1 ? 's' : ''} logged
                  </span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        )}
      </div>

      {/* Dynamic Help Content from Admin */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : articles.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(articlesByCategory).map(([category, categoryArticles]) => (
            <div key={category} className="bg-card p-6 rounded-xl border border-border shadow-soft">
              <h3 className="font-bold text-lg text-card-foreground mb-4 capitalize flex items-center gap-2">
                <Info size={20} className="text-primary"/> {category}
              </h3>
              <div className="space-y-2">
                {categoryArticles.map((article) => (
                  <FaqItem 
                    key={article.id}
                    question={article.title}
                    answer={<div className="whitespace-pre-wrap">{article.content}</div>}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state - no hardcoded content */
        <div className="bg-card p-8 rounded-xl border border-border text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg text-foreground mb-2">No Help Articles Yet</h3>
          <p className="text-muted-foreground text-sm">
            Help content will appear here once added by an administrator.
          </p>
        </div>
      )}

      {/* Additional Help */}
      <div className="bg-primary/10 p-6 rounded-xl border border-primary/20">
        <h3 className="font-bold text-lg text-primary mb-3 flex items-center gap-2">
          <MessageCircle size={20}/> Need More Help?
        </h3>
        <p className="text-sm text-card-foreground mb-4">
          If you can't find what you're looking for, use the contact options above or check back later for updated help articles.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleOpenLiveChat}>
            <MessageCircle className="h-4 w-4 mr-1" /> Start Chat
          </Button>
          <Button size="sm" variant="outline" onClick={handleEmailSupport}>
            <Mail className="h-4 w-4 mr-1" /> Email Us
          </Button>
        </div>
      </div>
    </div>
  );
}
