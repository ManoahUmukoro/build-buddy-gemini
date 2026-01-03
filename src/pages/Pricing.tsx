import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreativePricing, PricingTier } from '@/components/ui/creative-pricing';
import { ArrowLeft, Sparkles, Zap, Loader2, Shield, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { toast } from 'sonner';
import { showNetworkError } from '@/lib/networkErrorHandler';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, userPlan } = useEntitlements();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [enabledProvider, setEnabledProvider] = useState<string | null>(null);
  const [proPlanConfig, setProPlanConfig] = useState<{ price: number; currency: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch plans and payment providers in parallel
      const [plansRes, providersRes] = await Promise.all([
        supabase.from('admin_settings').select('value').eq('key', 'subscription_plans').single(),
        supabase.from('admin_settings').select('value').eq('key', 'payment_providers').single(),
      ]);

      // Handle plans - find the Pro plan config
      if (plansRes.data?.value) {
        const plansData = typeof plansRes.data.value === 'string' 
          ? JSON.parse(plansRes.data.value) 
          : plansRes.data.value || [];
        const proPlan = plansData.find((p: any) => p.id === 'pro' || p.name?.toLowerCase().includes('pro'));
        if (proPlan) {
          setProPlanConfig({ price: proPlan.price || 2999, currency: proPlan.currency || 'NGN' });
        }
      }

      // Handle payment providers - find the first enabled one
      if (providersRes.data?.value) {
        const providers = providersRes.data.value as Record<string, { enabled: boolean; secret_key?: string }>;
        for (const [name, config] of Object.entries(providers)) {
          if (config.enabled && config.secret_key) {
            setEnabledProvider(name);
            break;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load pricing plans. Please try again.');
      showNetworkError(err, 'Loading plans', fetchData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubscribe = async (planId: string, price: number, currency: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (price === 0) {
      navigate('/');
      return;
    }
    
    // Check payment provider
    if (!enabledProvider) {
      toast.error('Payment not available', {
        description: 'No payment provider is configured. Please contact support at support@webnexer.com',
        duration: 6000,
        action: {
          label: 'Copy Email',
          onClick: () => {
            navigator.clipboard.writeText('support@webnexer.com');
            toast.success('Email copied!');
          }
        }
      });
      return;
    }
    
    setSubscribing(planId);
    
    try {
      const callbackUrl = `${window.location.origin}/payment-callback`;
      const { data, error } = await supabase.functions.invoke('init-payment', {
        body: {
          email: user.email,
          userId: user.id,
          amount: price,
          currency: currency,
          planId: planId,
          provider: enabledProvider,
          callbackUrl,
        },
      });
      
      if (error) throw error;
      
      if (data?.paymentUrl) {
        localStorage.setItem('pending_payment', JSON.stringify({
          reference: data.reference,
          provider: enabledProvider,
          planId: planId,
        }));
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('No payment URL received from server');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      
      if (err.message?.includes('not configured') || err.message?.includes('not enabled')) {
        toast.error('Payment provider issue', {
          description: 'The payment system needs configuration. Please contact support.',
          duration: 6000,
        });
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        showNetworkError(err, 'Payment', () => handleSubscribe(planId, price, currency));
      } else {
        toast.error('Payment failed', {
          description: err.message || 'Unable to start payment. Please try again.',
          duration: 5000,
          action: {
            label: 'Retry',
            onClick: () => handleSubscribe(planId, price, currency),
          }
        });
      }
    } finally {
      setSubscribing(null);
    }
  };

  const proPrice = proPlanConfig?.price || 2999;
  const proCurrency = proPlanConfig?.currency || 'NGN';

  const tiers: PricingTier[] = [
    {
      name: "Free",
      icon: <Zap className="w-6 h-6" />,
      price: 0,
      description: "Everything you need to manage your life",
      color: "blue",
      features: [
        "Unlimited Tasks & Goals",
        "Full Finance Tracking",
        "Journal & Mood Tracking",
        "Bank Statement Import",
        "Habit Tracking & Streaks",
        "Data Export",
        "Email Digests",
      ],
      buttonText: user ? "Go to Dashboard" : "Get Started Free",
      onSelect: () => navigate(user ? '/' : '/auth'),
      isCurrentPlan: user && userPlan === 'free',
    },
    {
      name: "Pro",
      icon: <Sparkles className="w-6 h-6" />,
      price: proPrice,
      currency: proCurrency === 'NGN' ? '₦' : proCurrency === 'USD' ? '$' : proCurrency,
      description: "Supercharge with AI intelligence",
      color: "purple",
      popular: true,
      features: [
        "Everything in Free",
        "AI Smart Sort & Prioritize",
        "AI Task Breakdown",
        "AI Finance Analysis & Chat",
        "Receipt Scanning (AI)",
        "Auto-Categorize Expenses (AI)",
        "AI Habit Suggestions",
        "AI Journal Recap",
      ],
      buttonText: subscribing === 'pro' ? "Processing..." : "Upgrade to Pro",
      onSelect: () => handleSubscribe('pro', proPrice, proCurrency),
      disabled: subscribing === 'pro',
      isCurrentPlan: isPro,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading plans...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Unable to Load Plans</h2>
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-foreground hidden sm:inline">LifeOS</span>
          </div>
          {!user ? (
            <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              Dashboard
            </Button>
          )}
        </div>
      </header>

      {/* Creative Pricing Section */}
      <CreativePricing
        tag="AI-Powered Productivity"
        title="Unlock Your Full Potential"
        description="Start free with all core features. Upgrade to Pro to unlock AI-powered insights and automation."
        tiers={tiers}
      />

      {/* Trust indicators */}
      <div className="flex items-center justify-center gap-6 py-8 text-sm text-muted-foreground border-t border-border/50 mx-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-500" />
          <span>Secure Payments</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>Cancel Anytime</span>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4 bg-muted/30">
        <div className="container mx-auto text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Questions? Contact us at{' '}
            <a href="mailto:support@webnexer.com" className="text-primary hover:underline">
              support@webnexer.com
            </a>
          </p>
          <a 
            href="https://webnexer.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
          >
            Powered by Webnexer
          </a>
        </div>
      </footer>
    </div>
  );
}
