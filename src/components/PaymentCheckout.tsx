import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Check, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PaymentProvider {
  enabled: boolean;
  public_key: string;
  secret_key: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  is_active: boolean;
}

interface PaymentCheckoutProps {
  planId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PaymentCheckout({ planId = 'pro', onSuccess, onCancel }: PaymentCheckoutProps) {
  const { user } = useAuth();
  const [providers, setProviders] = useState<Record<string, PaymentProvider>>({});
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>(planId);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [providersRes, plansRes] = await Promise.all([
          supabase.from('admin_settings').select('value').eq('key', 'payment_providers').single(),
          supabase.from('admin_settings').select('value').eq('key', 'subscription_plans').single(),
        ]);

        if (providersRes.data?.value) {
          const p = providersRes.data.value as unknown as Record<string, PaymentProvider>;
          setProviders(p);
          // Select first enabled provider
          const firstEnabled = Object.entries(p).find(([_, v]) => v.enabled)?.[0];
          if (firstEnabled) setSelectedProvider(firstEnabled);
        }

        if (plansRes.data?.value) {
          const plansList = plansRes.data.value as unknown as SubscriptionPlan[];
          setPlans(plansList.filter(p => p.is_active && p.price > 0));
        }
      } catch (err) {
        console.error('Error fetching payment data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const enabledProviders = Object.entries(providers)
    .filter(([_, v]) => v.enabled)
    .map(([key]) => key);

  const currentPlan = plans.find(p => p.id === selectedPlan);

  const handlePayment = async () => {
    if (!user?.email || !currentPlan || !selectedProvider) {
      toast.error('Please select a plan and payment method');
      return;
    }

    setProcessing(true);

    try {
      const callbackUrl = `${window.location.origin}/payment-callback`;

      const { data, error } = await supabase.functions.invoke('init-payment', {
        body: {
          provider: selectedProvider,
          planId: currentPlan.id,
          userId: user.id,
          email: user.email,
          amount: currentPlan.price,
          currency: currentPlan.currency,
          callbackUrl,
        },
      });

      if (error) throw error;

      if (data.paymentUrl) {
        // Store reference for verification
        localStorage.setItem('pending_payment', JSON.stringify({
          reference: data.reference,
          provider: selectedProvider,
          planId: currentPlan.id,
        }));
        
        // Redirect to payment page
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('No payment URL received');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      toast.error(err.message || 'Failed to initialize payment');
      setProcessing(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    const symbols: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' };
    return `${symbols[currency] || currency}${price.toLocaleString()}`;
  };

  const getProviderName = (key: string) => {
    const names: Record<string, string> = {
      paystack: 'Paystack',
      flutterwave: 'Flutterwave',
      stripe: 'Stripe',
    };
    return names[key] || key;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (enabledProviders.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Payment is not available at this time.</p>
          <p className="text-sm text-muted-foreground mt-2">Please contact support for assistance.</p>
        </CardContent>
      </Card>
    );
  }

  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">No subscription plans are currently available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Upgrade to Pro
        </CardTitle>
        <CardDescription>Choose your plan and payment method</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan Selection */}
        {plans.length > 1 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Plan</Label>
            <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan}>
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPlan === plan.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={plan.id} id={plan.id} />
                    <div>
                      <Label htmlFor={plan.id} className="font-medium cursor-pointer">
                        {plan.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(plan.price, plan.currency)}/{plan.interval}
                      </p>
                    </div>
                  </div>
                  {plan.id === 'pro' && (
                    <Badge variant="secondary">Popular</Badge>
                  )}
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Plan Features */}
        {currentPlan && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">What's included:</h4>
            <ul className="space-y-1.5">
              {currentPlan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Payment Provider Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Payment Method</Label>
          <RadioGroup value={selectedProvider} onValueChange={setSelectedProvider}>
            {enabledProviders.map((provider) => (
              <div
                key={provider}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedProvider === provider ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => setSelectedProvider(provider)}
              >
                <RadioGroupItem value={provider} id={provider} />
                <Label htmlFor={provider} className="cursor-pointer flex-1">
                  {getProviderName(provider)}
                </Label>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Total */}
        {currentPlan && (
          <div className="flex items-center justify-between py-4 border-t">
            <span className="font-medium">Total</span>
            <span className="text-xl font-bold">
              {formatPrice(currentPlan.price, currentPlan.currency)}
              <span className="text-sm font-normal text-muted-foreground">/{currentPlan.interval}</span>
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
          <Button 
            onClick={handlePayment} 
            disabled={processing || !selectedProvider || !currentPlan}
            className="flex-1"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay {currentPlan ? formatPrice(currentPlan.price, currentPlan.currency) : ''}
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Your payment is secured and processed by {getProviderName(selectedProvider)}
        </p>
      </CardContent>
    </Card>
  );
}
