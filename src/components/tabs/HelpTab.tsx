import { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Info, Loader2, FileText, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AnnouncementTicker } from '@/components/AnnouncementTicker';

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

      {/* Contact Support - always show */}
      <div className="bg-primary/10 p-6 rounded-xl border border-primary/20">
        <h3 className="font-bold text-lg text-primary mb-3 flex items-center gap-2">
          <MessageCircle size={20}/> Need More Help?
        </h3>
        <p className="text-sm text-card-foreground">
          If you can't find what you're looking for, please contact support or check back later for updated help articles.
        </p>
      </div>
    </div>
  );
}