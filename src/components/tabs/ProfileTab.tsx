import { useState, useEffect, useRef } from 'react';
import { User, Mail, Crown, Loader2, Check, CreditCard, History, XCircle, Bell, BellOff, Camera, Shield, LogOut, Key, Download, Upload, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  reference: string;
  status: string;
  payment_provider: string;
  plan: string;
  created_at: string;
}

export function ProfileTab() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { profile, loading: profileLoading } = useProfile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [userPlan, setUserPlan] = useState<{ plan: string; status: string } | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [payingWithPaystack, setPayingWithPaystack] = useState(false);
  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [requestingNotifications, setRequestingNotifications] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  useEffect(() => {
    // Check notification permission
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  useEffect(() => {
    // Load Paystack script
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => setPaystackLoaded(true);
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
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

  useEffect(() => {
    async function fetchPaymentHistory() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('payment_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setPaymentHistory(data || []);
      } catch (err) {
        console.error('Error fetching payment history:', err);
      } finally {
        setLoadingHistory(false);
      }
    }

    fetchPaymentHistory();
  }, [user]);

  // Load avatar from localStorage
  useEffect(() => {
    if (user?.id) {
      const savedAvatar = localStorage.getItem(`avatar_${user.id}`);
      setAvatarUrl(savedAvatar);
    } else {
      setAvatarUrl(null);
    }
  }, [user?.id]);

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

  async function handleRequestNotifications() {
    if (!('Notification' in window)) {
      toast.error('Your browser does not support notifications');
      return;
    }

    setRequestingNotifications(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        toast.success('Notifications enabled!');
        // Test notification
        new Notification('LifeOS Notifications', {
          body: 'You will now receive task reminders',
          icon: '/favicon.ico'
        });
      } else if (permission === 'denied') {
        toast.error('Notification permission denied. Please enable in browser settings.');
      } else {
        toast.info('Please respond to the notification permission prompt');
      }
    } catch (err) {
      console.error('Error requesting notifications:', err);
      toast.error('Failed to enable notifications. Try in browser settings.');
    } finally {
      setRequestingNotifications(false);
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

      const paymentRef = `lifeos_pro_${user.id}_${Date.now()}`;

      const handler = window.PaystackPop.setup({
        key: providers.paystack.public_key,
        email: user.email,
        amount: 500000, // Amount in kobo (5000 NGN = 500000 kobo)
        currency: 'NGN',
        ref: paymentRef,
        metadata: {
          user_id: user.id,
          plan: 'pro',
        },
        callback: async (response: any) => {
          // Payment successful - update user plan and record payment
          try {
            // Record payment
            await supabase.from('payment_history').insert({
              user_id: user.id,
              amount: 5000,
              currency: 'NGN',
              reference: paymentRef,
              status: 'success',
              payment_provider: 'paystack',
              plan: 'pro'
            });

            // Update plan
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
            // Refresh payment history
            const { data } = await supabase
              .from('payment_history')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(10);
            setPaymentHistory(data || []);
            
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

  async function handleCancelSubscription() {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_plans')
        .update({ plan: 'free', status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;

      setUserPlan({ plan: 'free', status: 'cancelled' });
      toast.success('Subscription cancelled. You can still use Pro features until the end of your billing period.');
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      toast.error('Failed to cancel subscription');
    }
  }

  if (profileLoading || loadingPlan) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, use local storage for avatar (in production, use Supabase Storage)
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatarUrl(result);
      localStorage.setItem(`avatar_${user?.id}`, result);
      toast.success('Profile picture updated!');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-2 md:px-0 mt-4 md:mt-10 pb-24 md:pb-0">
      {/* Profile Info with Avatar */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div 
              onClick={handleAvatarClick}
              className="relative w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center cursor-pointer group overflow-hidden"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="text-primary" size={32} />
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white" size={20} />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
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

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <Settings className="text-muted-foreground" size={24} />
            </div>
            <div>
              <CardTitle>Account</CardTitle>
              <CardDescription>Manage your account settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAdmin && (
            <Link to="/admin">
              <Button variant="outline" className="w-full gap-2 justify-start">
                <Shield size={16} />
                Admin Panel
              </Button>
            </Link>
          )}
          <Button variant="outline" className="w-full gap-2 justify-start text-destructive hover:text-destructive" onClick={handleSignOut}>
            <LogOut size={16} />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              {notificationsEnabled ? <Bell className="text-primary" size={24} /> : <BellOff className="text-muted-foreground" size={24} />}
            </div>
            <div>
              <CardTitle>Browser Notifications</CardTitle>
              <CardDescription>Get task reminders in your browser</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {notificationsEnabled 
                  ? 'Notifications are enabled. You will receive task reminders.'
                  : 'Enable notifications to receive task reminders.'}
              </p>
            </div>
            {notificationsEnabled ? (
              <Badge variant="default" className="bg-green-500">Enabled</Badge>
            ) : (
              <Button 
                onClick={handleRequestNotifications}
                disabled={requestingNotifications}
                size="sm"
              >
                {requestingNotifications ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Plan */}
      {(() => {
        const isPro = userPlan?.plan === 'pro';
        return (
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
                      <Check size={16} className="text-green-500" />
                      AI Command Center
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Check size={16} className="text-green-500" />
                      Advanced Analytics
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Check size={16} className="text-green-500" />
                      Unlimited Entries
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Check size={16} className="text-green-500" />
                      Priority Support
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="gap-2 text-destructive hover:text-destructive">
                        <XCircle size={16} />
                        Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel your Pro subscription? You'll lose access to premium features at the end of your billing period.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Yes, Cancel
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
        );
      })()}

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <History className="text-primary" size={24} />
              </div>
              <div>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Your recent transactions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="capitalize">{payment.plan}</TableCell>
                        <TableCell>
                          {payment.currency} {payment.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={payment.status === 'success' ? 'default' : 'secondary'} className={payment.status === 'success' ? 'bg-green-500' : ''}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}