import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function PaymentCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [plan, setPlan] = useState<string>('');

  useEffect(() => {
    async function verifyPayment() {
      try {
        // Get pending payment info
        const pendingPayment = localStorage.getItem('pending_payment');
        const paymentData = pendingPayment ? JSON.parse(pendingPayment) : null;

        // Get reference from URL or localStorage
        const reference = searchParams.get('reference') || 
                         searchParams.get('tx_ref') || 
                         searchParams.get('trxref') ||
                         paymentData?.reference;

        const provider = searchParams.get('provider') || paymentData?.provider;
        const transactionId = searchParams.get('transaction_id');

        // Check if payment was cancelled
        if (searchParams.get('cancelled') === 'true') {
          setStatus('failed');
          localStorage.removeItem('pending_payment');
          return;
        }

        if (!reference || !provider) {
          setStatus('failed');
          return;
        }

        // Verify payment
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { reference, provider, transactionId },
        });

        if (error) throw error;

        if (data.success) {
          setStatus('success');
          setPlan(data.plan);
          localStorage.removeItem('pending_payment');
          toast.success('Payment successful! Your plan has been upgraded.');
        } else {
          setStatus('failed');
          localStorage.removeItem('pending_payment');
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setStatus('failed');
      }
    }

    verifyPayment();
  }, [searchParams]);

  const handleContinue = () => {
    navigate('/');
  };

  const handleRetry = () => {
    navigate('/pricing');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-semibold mb-2">Verifying Payment</h2>
              <p className="text-muted-foreground">
                Please wait while we confirm your payment...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground mb-6">
                You've been upgraded to {plan || 'Pro'}. Enjoy all the premium features!
              </p>
              <Button onClick={handleContinue} className="w-full">
                Continue to App
              </Button>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Payment Failed</h2>
              <p className="text-muted-foreground mb-6">
                We couldn't verify your payment. If you believe this is an error, please contact support.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleContinue} className="flex-1">
                  Go Home
                </Button>
                <Button onClick={handleRetry} className="flex-1">
                  Try Again
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
