import { useState, useEffect } from 'react';
import { User, Mail, Crown, Loader2, Check, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

export function ProfileTab() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [userPlan, setUserPlan] = useState<{ plan: string; status: string } | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [payingWithPaystack, setPayingWithPaystack] = useState(false);
  const [paystackLoaded, setPaystackLoaded] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  useEffect(() => {
    // Load Paystack script
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => setPaystackLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    async function fetchPlan() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_plans')
          .select('plan, status')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setUserPlan(data || { plan: 'free', status: 'active' });
      } catch (err) {
        console.error('Error fetching plan:', err);
      } finally {
        setLoadingPlan(false);
      }
    }

    fetchPlan();
  }, [user]);

  async function handleSaveProfile() {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpgradeToPro() {
    if (!user || !paystackLoaded) {
      toast.error('Payment system not ready. Please try again.');
      return;
    }

    // Fetch Paystack public key from admin settings
    try {
      setPayingWithPaystack(true);
      const { data: settings, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'payment_providers')
        .single();

      if (error) throw error;

      const providers = typeof settings?.value === 'string' 
        ? JSON.parse(settings.value) 
        : settings?.value;

      if (!providers?.paystack?.enabled || !providers?.paystack?.public_key) {
        toast.error('Paystack payments are not configured. Please contact support.');
        setPayingWithPaystack(false);
        return;
      }

      const handler = window.PaystackPop.setup({
        key: providers.paystack.public_key,
        email: user.email,
        amount: 500000, // Amount in kobo (5000 NGN = 500000 kobo)
        currency: 'NGN',
        ref: `lifeos_pro_${user.id}_${Date.now()}`,
        metadata: {
          user_id: user.id,
          plan: 'pro',
        },
        callback: async (response: any) => {
          // Payment successful - update user plan
          try {
            const { error: planError } = await supabase
              .from('user_plans')
              .upsert({ 
                user_id: user.id, 
                plan: 'pro', 
                status: 'active',
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' });

            if (planError) throw planError;

            setUserPlan({ plan: 'pro', status: 'active' });
            toast.success('Welcome to Pro! Your account has been upgraded.');
          } catch (err) {
            console.error('Error updating plan:', err);
            toast.error('Payment received but failed to update plan. Please contact support.');
          } finally {
            setPayingWithPaystack(false);
          }
        },
        onClose: () => {
          setPayingWithPaystack(false);
        },
      });

      handler.openIframe();
    } catch (err) {
      console.error('Error initiating payment:', err);
      toast.error('Failed to initiate payment');
      setPayingWithPaystack(false);
    }
  }

  if (profileLoading || loadingPlan) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPro = userPlan?.plan === 'pro';

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-2 md:px-0 mt-4 md:mt-10 pb-20 md:pb-0">
      {/* Profile Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="text-primary" size={24} />
            </div>
            <div>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your account information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail size={14} />
              Email
            </Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName" className="flex items-center gap-2">
              <User size={14} />
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
            />
          </div>

          <Button 
            onClick={handleSaveProfile} 
            disabled={saving || displayName === profile?.display_name}
            className="gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check size={16} />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Subscription Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPro ? 'bg-amber-500/10' : 'bg-muted'}`}>
                <Crown className={isPro ? 'text-amber-500' : 'text-muted-foreground'} size={24} />
              </div>
              <div>
                <CardTitle>Subscription Plan</CardTitle>
                <CardDescription>Manage your subscription</CardDescription>
              </div>
            </div>
            <Badge variant={isPro ? 'default' : 'secondary'} className={isPro ? 'bg-amber-500' : ''}>
              {isPro ? 'Pro' : 'Free'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isPro ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                You're on the <strong>Pro plan</strong>. Enjoy all premium features!
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Check size={16} className="text-success" />
                  AI Command Center
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Check size={16} className="text-success" />
                  Advanced Analytics
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Check size={16} className="text-success" />
                  Unlimited Entries
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Check size={16} className="text-success" />
                  Priority Support
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Upgrade to <strong>Pro</strong> to unlock all features.
              </p>
              
              <div className="bg-muted/50 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Pro Plan</span>
                  <span className="text-2xl font-bold">₦5,000<span className="text-sm font-normal text-muted-foreground">/month</span></span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-primary" />
                    AI-powered insights and chat
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-primary" />
                    Advanced analytics dashboard
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-primary" />
                    Unlimited journal entries & goals
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-primary" />
                    Priority email support
                  </li>
                </ul>
              </div>

              <Button 
                onClick={handleUpgradeToPro} 
                disabled={payingWithPaystack || !paystackLoaded}
                className="w-full gap-2"
                size="lg"
              >
                {payingWithPaystack ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard size={18} />
                )}
                {payingWithPaystack ? 'Processing...' : 'Upgrade to Pro'}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                Secure payment powered by Paystack
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
