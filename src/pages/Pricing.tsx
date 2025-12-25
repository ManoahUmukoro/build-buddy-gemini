import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, ArrowLeft, Crown, Zap, Loader2, Shield, Star, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { toast } from 'sonner';
import { showNetworkError } from '@/lib/networkErrorHandler';

interface PlanConfig {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  is_active: boolean;
}

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, userPlan } = useEntitlements();
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [enabledProvider, setEnabledProvider] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch plans and payment providers in parallel
      const [plansRes, providersRes] = await Promise.all([
        supabase.from('admin_settings').select('value').eq('key', 'subscription_plans').single(),
        supabase.from('admin_settings').select('value').eq('key', 'payment_providers').single(),
      ]);

      // Handle plans
      if (plansRes.data?.value) {
        const plansData = typeof plansRes.data.value === 'string' 
          ? JSON.parse(plansRes.data.value) 
          : plansRes.data.value || [];
        const activePlans = plansData.filter((p: PlanConfig) => p.is_active);
        setPlans(activePlans);
      } else {
        // Default plans if none configured
        setPlans([
          {
            id: 'free',
            name: 'Free',
            price: 0,
            currency: 'NGN',
            interval: 'month',
            features: ['Basic task management', '3 systems/goals', 'Journal entries', 'Basic finance tracking'],
            is_active: true,
          },
          {
            id: 'pro',
            name: 'Pro',
            price: 2999,
            currency: 'NGN',
            interval: 'month',
            features: ['Unlimited systems/goals', 'AI-powered insights', 'Receipt scanning', 'Priority support', 'Export data', 'Advanced analytics'],
            is_active: true,
          },
        ]);
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

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Free';
    const symbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency;
    return `${symbol}${price.toLocaleString()}`;
  };

  const getPlanIcon = (planName: string) => {
    if (planName.toLowerCase().includes('pro') || planName.toLowerCase().includes('premium')) {
      return <Crown className="h-6 w-6 text-amber-500" />;
    }
    return <Zap className="h-6 w-6 text-primary" />;
  };

  const handleSubscribe = async (plan: PlanConfig) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (plan.price === 0) {
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
    
    setSubscribing(plan.id);
    
    try {
      const callbackUrl = `${window.location.origin}/payment-callback`;
      const { data, error } = await supabase.functions.invoke('init-payment', {
        body: {
          email: user.email,
          userId: user.id,
          amount: plan.price,
          currency: plan.currency,
          planId: plan.id,
          provider: enabledProvider,
          callbackUrl,
        },
      });
      
      if (error) throw error;
      
      if (data?.paymentUrl) {
        // Store pending payment for callback verification
        localStorage.setItem('pending_payment', JSON.stringify({
          reference: data.reference,
          provider: enabledProvider,
          planId: plan.id,
        }));
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('No payment URL received from server');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      
      // Show specific error message based on error type
      if (err.message?.includes('not configured') || err.message?.includes('not enabled')) {
        toast.error('Payment provider issue', {
          description: 'The payment system needs configuration. Please contact support.',
          duration: 6000,
        });
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        showNetworkError(err, 'Payment', () => handleSubscribe(plan));
      } else {
        toast.error('Payment failed', {
          description: err.message || 'Unable to start payment. Please try again.',
          duration: 5000,
          action: {
            label: 'Retry',
            onClick: () => handleSubscribe(plan),
          }
        });
      }
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading plans...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
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
            <span className="font-bold text-foreground hidden sm:inline">Life Command Center</span>
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

      {/* Hero */}
      <section className="py-12 md:py-20 px-4">
        <div className="container mx-auto text-center max-w-3xl space-y-6">
          <Badge variant="secondary" className="px-4 py-1.5 text-sm">
            <Star className="h-3.5 w-3.5 mr-1.5 inline" />
            Pricing Plans
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
            Choose the Perfect Plan
            <span className="block text-primary mt-2">for Your Journey</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start for free and unlock powerful features when you're ready to level up
          </p>
          
          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 pt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Secure Payments</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Cancel Anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className={`grid gap-8 max-w-4xl mx-auto ${
            plans.length === 1 ? 'grid-cols-1 max-w-md' : 
            plans.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {plans.map((plan, index) => {
              const isPopular = plan.name.toLowerCase().includes('pro') || index === 1;
              const isCurrentPlan = user && userPlan === plan.id;
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative flex flex-col transition-all duration-300 hover:shadow-xl ${
                    isPopular 
                      ? 'border-2 border-primary shadow-lg shadow-primary/10 md:scale-105' 
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground shadow-lg px-4">
                        <Star className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-2 pt-8">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                      isPopular ? 'bg-primary/15' : 'bg-muted'
                    }`}>
                      {getPlanIcon(plan.name)}
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-base">
                      {plan.price === 0 ? 'Get started for free' : 'Unlock all features'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex-1 pt-4">
                    <div className="text-center mb-8">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-5xl font-bold text-foreground">
                          {formatPrice(plan.price, plan.currency)}
                        </span>
                        {plan.price > 0 && (
                          <span className="text-muted-foreground text-lg">/{plan.interval}</span>
                        )}
                      </div>
                    </div>
                    
                    <ul className="space-y-4">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className={`p-0.5 rounded-full mt-0.5 ${
                            isPopular ? 'bg-primary' : 'bg-green-500'
                          }`}>
                            <Check className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  
                  <CardFooter className="pt-6">
                    <Button 
                      className={`w-full h-12 text-base font-medium ${
                        isPopular ? 'shadow-lg' : ''
                      }`}
                      variant={isPopular ? 'default' : 'outline'}
                      size="lg"
                      disabled={subscribing === plan.id || isCurrentPlan}
                      onClick={() => handleSubscribe(plan)}
                    >
                      {subscribing === plan.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : isCurrentPlan ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Current Plan
                        </>
                      ) : plan.price === 0 ? (
                        'Get Started Free'
                      ) : (
                        'Subscribe Now'
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          
          {/* FAQ or additional info */}
          <div className="mt-16 text-center max-w-2xl mx-auto">
            <p className="text-muted-foreground">
              Have questions about our plans?{' '}
              <a 
                href="mailto:support@webnexer.com" 
                className="text-primary hover:underline font-medium"
              >
                Contact our team
              </a>
            </p>
          </div>
        </div>
      </section>

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