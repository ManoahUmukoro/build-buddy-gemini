import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Loader2, ExternalLink, Plus, Edit, Trash2, CreditCard, Package } from 'lucide-react';

interface PaymentProvider {
  enabled: boolean;
  public_key: string;
  secret_key: string;
}

interface PaymentProviders {
  paystack: PaymentProvider;
  flutterwave: PaymentProvider;
  stripe: PaymentProvider;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  is_active: boolean;
}

export default function AdminBilling() {
  const [providers, setProviders] = useState<PaymentProviders>({
    paystack: { enabled: false, public_key: '', secret_key: '' },
    flutterwave: { enabled: false, public_key: '', secret_key: '' },
    stripe: { enabled: false, public_key: '', secret_key: '' },
  });
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editPlan, setEditPlan] = useState<SubscriptionPlan | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      // Fetch payment providers
      const { data: providerData, error: providerError } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'payment_providers')
        .single();

      if (providerError && providerError.code !== 'PGRST116') throw providerError;

      if (providerData?.value) {
        const parsed = typeof providerData.value === 'string' ? JSON.parse(providerData.value) : providerData.value;
        setProviders(parsed);
      }

      // Fetch subscription plans
      const { data: plansData, error: plansError } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'subscription_plans')
        .single();

      if (plansError && plansError.code !== 'PGRST116') throw plansError;

      if (plansData?.value) {
        const parsed = typeof plansData.value === 'string' ? JSON.parse(plansData.value) : plansData.value;
        setPlans(parsed);
      } else {
        // Default plans
        setPlans([
          {
            id: 'free',
            name: 'Free',
            price: 0,
            currency: 'NGN',
            interval: 'monthly',
            features: ['Basic task management', 'Up to 3 systems', 'Basic finance tracking'],
            is_active: true,
          },
          {
            id: 'pro',
            name: 'Pro',
            price: 5000,
            currency: 'NGN',
            interval: 'monthly',
            features: ['Unlimited tasks & systems', 'AI-powered insights', 'Advanced analytics', 'Priority support', 'Receipt scanning'],
            is_active: true,
          },
        ]);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Failed to load billing settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveProviders() {
    try {
      setSaving(true);

      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id')
        .eq('key', 'payment_providers')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('admin_settings')
          .update({ value: JSON.parse(JSON.stringify(providers)) })
          .eq('key', 'payment_providers');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_settings')
          .insert([{ key: 'payment_providers', value: JSON.parse(JSON.stringify(providers)) }]);
        if (error) throw error;
      }

      toast.success('Payment providers saved');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function savePlans() {
    try {
      setSaving(true);

      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id')
        .eq('key', 'subscription_plans')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('admin_settings')
          .update({ value: JSON.parse(JSON.stringify(plans)) })
          .eq('key', 'subscription_plans');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_settings')
          .insert([{ key: 'subscription_plans', value: JSON.parse(JSON.stringify(plans)) }]);
        if (error) throw error;
      }

      toast.success('Subscription plans saved');
    } catch (err) {
      console.error('Error saving plans:', err);
      toast.error('Failed to save plans');
    } finally {
      setSaving(false);
    }
  }

  function updateProvider(provider: keyof PaymentProviders, field: keyof PaymentProvider, value: any) {
    setProviders({
      ...providers,
      [provider]: {
        ...providers[provider],
        [field]: value,
      },
    });
  }

  function handleSavePlan() {
    if (!editPlan) return;

    if (editPlan.id && plans.some(p => p.id === editPlan.id)) {
      setPlans(plans.map(p => p.id === editPlan.id ? editPlan : p));
    } else {
      const newPlan = { ...editPlan, id: editPlan.id || Date.now().toString() };
      setPlans([...plans, newPlan]);
    }
    
    setPlanDialogOpen(false);
    setEditPlan(null);
    toast.success('Plan updated - click Save Plans to persist changes');
  }

  function deletePlan(id: string) {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    setPlans(plans.filter(p => p.id !== id));
    toast.success('Plan removed - click Save Plans to persist changes');
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Billing & Payments</h1>
            <p className="text-muted-foreground">Configure payment providers and subscription plans</p>
          </div>
        </div>

        <Tabs defaultValue="providers">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="providers" className="flex items-center gap-2 py-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payment</span>
              <span className="sm:hidden">Pay</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2 py-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Plans</span>
              <span className="sm:hidden">Plans</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={saveProviders} disabled={saving} size="sm">
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                <span className="hidden sm:inline">Save Providers</span>
                <span className="sm:hidden">Save</span>
              </Button>
            </div>

            <Tabs defaultValue="paystack">
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="paystack" className="text-xs sm:text-sm py-2">Paystack</TabsTrigger>
                <TabsTrigger value="flutterwave" className="text-xs sm:text-sm py-2">Flutterwave</TabsTrigger>
                <TabsTrigger value="stripe" className="text-xs sm:text-sm py-2">Stripe</TabsTrigger>
              </TabsList>

              <TabsContent value="paystack">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Paystack</CardTitle>
                        <CardDescription>Accept payments in Nigeria and Ghana</CardDescription>
                      </div>
                      <Switch
                        checked={providers.paystack.enabled}
                        onCheckedChange={(checked) => updateProvider('paystack', 'enabled', checked)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="paystack-public">Public Key</Label>
                      <Input
                        id="paystack-public"
                        placeholder="pk_live_..."
                        value={providers.paystack.public_key}
                        onChange={(e) => updateProvider('paystack', 'public_key', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paystack-secret">Secret Key</Label>
                      <Input
                        id="paystack-secret"
                        type="password"
                        placeholder="sk_live_..."
                        value={providers.paystack.secret_key}
                        onChange={(e) => updateProvider('paystack', 'secret_key', e.target.value)}
                      />
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://dashboard.paystack.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Paystack Dashboard
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="flutterwave">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Flutterwave</CardTitle>
                        <CardDescription>Pan-African payment gateway</CardDescription>
                      </div>
                      <Switch
                        checked={providers.flutterwave.enabled}
                        onCheckedChange={(checked) => updateProvider('flutterwave', 'enabled', checked)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="flw-public">Public Key</Label>
                      <Input
                        id="flw-public"
                        placeholder="FLWPUBK-..."
                        value={providers.flutterwave.public_key}
                        onChange={(e) => updateProvider('flutterwave', 'public_key', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="flw-secret">Secret Key</Label>
                      <Input
                        id="flw-secret"
                        type="password"
                        placeholder="FLWSECK-..."
                        value={providers.flutterwave.secret_key}
                        onChange={(e) => updateProvider('flutterwave', 'secret_key', e.target.value)}
                      />
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://dashboard.flutterwave.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Flutterwave Dashboard
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stripe">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Stripe</CardTitle>
                        <CardDescription>Global payment processor</CardDescription>
                      </div>
                      <Switch
                        checked={providers.stripe.enabled}
                        onCheckedChange={(checked) => updateProvider('stripe', 'enabled', checked)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="stripe-public">Publishable Key</Label>
                      <Input
                        id="stripe-public"
                        placeholder="pk_live_..."
                        value={providers.stripe.public_key}
                        onChange={(e) => updateProvider('stripe', 'public_key', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stripe-secret">Secret Key</Label>
                      <Input
                        id="stripe-secret"
                        type="password"
                        placeholder="sk_live_..."
                        value={providers.stripe.secret_key}
                        onChange={(e) => updateProvider('stripe', 'secret_key', e.target.value)}
                      />
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Stripe Dashboard
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Define subscription plans that users can purchase. Changes sync to the user profile section.
              </p>
              <div className="flex gap-2">
                <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setEditPlan({
                        id: '',
                        name: '',
                        price: 0,
                        currency: 'NGN',
                        interval: 'monthly',
                        features: [],
                        is_active: true,
                      })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editPlan?.id ? 'Edit Plan' : 'New Plan'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="plan-name">Plan Name</Label>
                          <Input
                            id="plan-name"
                            value={editPlan?.name || ''}
                            onChange={(e) => setEditPlan(prev => prev ? { ...prev, name: e.target.value } : null)}
                            placeholder="e.g., Pro"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="plan-id">Plan ID</Label>
                          <Input
                            id="plan-id"
                            value={editPlan?.id || ''}
                            onChange={(e) => setEditPlan(prev => prev ? { ...prev, id: e.target.value.toLowerCase().replace(/\s+/g, '_') } : null)}
                            placeholder="e.g., pro"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="plan-price">Price</Label>
                          <Input
                            id="plan-price"
                            type="number"
                            value={editPlan?.price || 0}
                            onChange={(e) => setEditPlan(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="plan-currency">Currency</Label>
                          <Input
                            id="plan-currency"
                            value={editPlan?.currency || 'NGN'}
                            onChange={(e) => setEditPlan(prev => prev ? { ...prev, currency: e.target.value.toUpperCase() } : null)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="plan-interval">Interval</Label>
                          <select
                            id="plan-interval"
                            value={editPlan?.interval || 'monthly'}
                            onChange={(e) => setEditPlan(prev => prev ? { ...prev, interval: e.target.value as 'monthly' | 'yearly' } : null)}
                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="plan-features">Features (one per line)</Label>
                        <Textarea
                          id="plan-features"
                          rows={5}
                          value={editPlan?.features?.join('\n') || ''}
                          onChange={(e) => setEditPlan(prev => prev ? { ...prev, features: e.target.value.split('\n').filter(f => f.trim()) } : null)}
                          placeholder="Unlimited tasks&#10;AI insights&#10;Priority support"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="plan-active"
                          checked={editPlan?.is_active ?? true}
                          onCheckedChange={(checked) => setEditPlan(prev => prev ? { ...prev, is_active: checked } : null)}
                        />
                        <Label htmlFor="plan-active">Active</Label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSavePlan}>Save Plan</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button onClick={savePlans} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Plans
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                {plans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No subscription plans yet. Create your first plan to get started.
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Plan</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Features</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {plans.map((plan) => (
                            <TableRow key={plan.id}>
                              <TableCell className="font-medium">{plan.name}</TableCell>
                              <TableCell>
                                {plan.price === 0 ? 'Free' : `${plan.currency} ${plan.price.toLocaleString()}/${plan.interval}`}
                              </TableCell>
                              <TableCell>
                                <div className="text-xs text-muted-foreground max-w-[200px] truncate">
                                  {plan.features.slice(0, 2).join(', ')}
                                  {plan.features.length > 2 && ` +${plan.features.length - 2} more`}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                                  {plan.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditPlan(plan);
                                      setPlanDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deletePlan(plan.id)}
                                    disabled={plan.id === 'free'}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {plans.map((plan) => (
                        <div key={plan.id} className="p-4 bg-muted/50 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{plan.name}</div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditPlan(plan);
                                  setPlanDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deletePlan(plan.id)}
                                disabled={plan.id === 'free'}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {plan.price === 0 ? 'Free' : `${plan.currency} ${plan.price.toLocaleString()}/${plan.interval}`}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={plan.is_active ? 'default' : 'secondary'} className="text-xs">
                              {plan.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {plan.features.length} features
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}