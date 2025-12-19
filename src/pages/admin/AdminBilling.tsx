import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Loader2, ExternalLink } from 'lucide-react';

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

export default function AdminBilling() {
  const [providers, setProviders] = useState<PaymentProviders>({
    paystack: { enabled: false, public_key: '', secret_key: '' },
    flutterwave: { enabled: false, public_key: '', secret_key: '' },
    stripe: { enabled: false, public_key: '', secret_key: '' },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'payment_providers')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setProviders(parsed);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Failed to load billing settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('admin_settings')
        .update({ value: JSON.parse(JSON.stringify(providers)) })
        .eq('key', 'payment_providers');

      if (error) throw error;

      toast.success('Billing settings saved');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
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
            <p className="text-muted-foreground">Configure payment providers and pricing</p>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        <Tabs defaultValue="paystack">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="paystack">Paystack</TabsTrigger>
            <TabsTrigger value="flutterwave">Flutterwave</TabsTrigger>
            <TabsTrigger value="stripe">Stripe</TabsTrigger>
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
      </div>
    </AdminLayout>
  );
}
