import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, ArrowLeft, Crown, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { toast } from 'sonner';

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
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'subscription_plans')
          .single();

        if (error) throw error;

        const plansData = typeof data?.value === 'string' 
          ? JSON.parse(data.value) 
          : data?.value || [];

        // Filter active plans
        const activePlans = plansData.filter((p: PlanConfig) => p.is_active);
        setPlans(activePlans);
      } catch (err) {
        console.error('Error fetching plans:', err);
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
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground">Life Command Center</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 md:py-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <Badge variant="secondary" className="mb-4">Pricing Plans</Badge>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground">
            Start for free and upgrade when you need more powerful features
          </p>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className={`grid gap-6 max-w-4xl mx-auto ${plans.length === 1 ? 'grid-cols-1 max-w-md' : plans.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {plans.map((plan, index) => {
              const isPopular = plan.name.toLowerCase().includes('pro') || index === 1;
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative flex flex-col ${isPopular ? 'border-primary shadow-lg scale-105' : 'border-border'}`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      {getPlanIcon(plan.name)}
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>
                      {plan.price === 0 ? 'Get started for free' : 'Unlock all features'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex-1">
                    <div className="text-center mb-6">
                      <span className="text-4xl font-bold text-foreground">
                        {formatPrice(plan.price, plan.currency)}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-muted-foreground">/{plan.interval}</span>
                      )}
                    </div>
                    
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={isPopular ? 'default' : 'outline'}
                      disabled={subscribing === plan.id || (user && userPlan === plan.id)}
                      onClick={async () => {
                        if (!user) {
                          navigate('/auth');
                          return;
                        }
                        if (plan.price === 0) {
                          navigate('/');
                          return;
                        }
                        // Initiate payment
                        setSubscribing(plan.id);
                        try {
                          const { data, error } = await supabase.functions.invoke('init-payment', {
                            body: {
                              email: user.email,
                              amount: plan.price,
                              currency: plan.currency,
                              plan: plan.id,
                              provider: 'paystack', // Default to Paystack
                            },
                          });
                          
                          if (error) throw error;
                          
                          if (data?.authorization_url) {
                            // Store reference for callback
                            localStorage.setItem('payment_reference', data.reference);
                            localStorage.setItem('payment_provider', 'paystack');
                            window.location.href = data.authorization_url;
                          } else {
                            throw new Error('No payment URL received');
                          }
                        } catch (err: any) {
                          console.error('Payment error:', err);
                          toast.error(err.message || 'Failed to initiate payment');
                        } finally {
                          setSubscribing(null);
                        }
                      }}
                    >
                      {subscribing === plan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : user && userPlan === plan.id ? (
                        'Current Plan'
                      ) : plan.price === 0 ? (
                        'Get Started'
                      ) : (
                        'Subscribe Now'
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            Questions? Contact us at support@webnexer.com
          </p>
          <a 
            href="https://webnexer.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary mt-2 inline-block"
          >
            Powered by Webnexer
          </a>
        </div>
      </footer>
    </div>
  );
}
