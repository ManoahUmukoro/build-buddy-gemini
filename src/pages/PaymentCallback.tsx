import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw, ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showNetworkError } from '@/lib/networkErrorHandler';

type PaymentStatus = 'verifying' | 'success' | 'failed' | 'cancelled' | 'error';

interface ErrorDetails {
  title: string;
  message: string;
  showRetry: boolean;
  showSupport: boolean;
}

export default function PaymentCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<PaymentStatus>('verifying');
  const [plan, setPlan] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const verifyPayment = async () => {
    setIsRetrying(true);
    
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

      // Check if payment was cancelled by user
      if (searchParams.get('cancelled') === 'true' || searchParams.get('status') === 'cancelled') {
        setStatus('cancelled');
        setErrorDetails({
          title: 'Payment Cancelled',
          message: 'You cancelled the payment. No charges were made to your account.',
          showRetry: true,
          showSupport: false,
        });
        localStorage.removeItem('pending_payment');
        return;
      }

      // Missing reference or provider
      if (!reference || !provider) {
        setStatus('error');
        setErrorDetails({
          title: 'Payment Information Missing',
          message: 'We couldn\'t find your payment details. This might happen if you refreshed the page or accessed this link directly.',
          showRetry: true,
          showSupport: true,
        });
        return;
      }

      // Verify payment with backend
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { reference, provider, transactionId },
      });

      if (error) {
        console.error('Verification API error:', error);
        throw error;
      }

      if (data.success) {
        setStatus('success');
        setPlan(data.plan || paymentData?.planId || 'Pro');
        localStorage.removeItem('pending_payment');
        toast.success('Payment successful! Your plan has been upgraded.');
      } else {
        setStatus('failed');
        setErrorDetails({
          title: 'Payment Not Confirmed',
          message: data.message || 'The payment could not be verified. If money was deducted, please contact support with your transaction reference.',
          showRetry: true,
          showSupport: true,
        });
        localStorage.removeItem('pending_payment');
      }
    } catch (err: any) {
      console.error('Payment verification error:', err);
      
      // Check for network errors
      if (err.message?.includes('fetch') || err.message?.includes('network') || !navigator.onLine) {
        setStatus('error');
        setErrorDetails({
          title: 'Connection Issue',
          message: 'Unable to verify your payment due to a network issue. Please check your connection and try again. Your payment status will be updated once verified.',
          showRetry: true,
          showSupport: false,
        });
        showNetworkError(err, 'Payment verification');
      } else {
        setStatus('failed');
        setErrorDetails({
          title: 'Verification Failed',
          message: err.message || 'Something went wrong while verifying your payment. Please contact support if money was deducted.',
          showRetry: true,
          showSupport: true,
        });
      }
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    verifyPayment();
  }, [searchParams]);

  const handleContinue = () => {
    navigate('/');
  };

  const handleRetry = () => {
    setStatus('verifying');
    setErrorDetails(null);
    verifyPayment();
  };

  const handleGoToPricing = () => {
    navigate('/pricing');
  };

  const handleContactSupport = () => {
    const reference = searchParams.get('reference') || 
                     searchParams.get('tx_ref') || 
                     searchParams.get('trxref') || '';
    
    const subject = encodeURIComponent('Payment Issue - Ref: ' + reference);
    const body = encodeURIComponent(`Hi Support,\n\nI'm having an issue with my payment.\n\nReference: ${reference}\nStatus: ${status}\n\nPlease help me resolve this.\n\nThank you`);
    
    window.open(`mailto:support@webnexer.com?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          {/* Verifying State */}
          {status === 'verifying' && (
            <>
              <div className="space-y-4">
                <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Verifying Payment</h2>
                  <p className="text-muted-foreground">
                    Please wait while we confirm your payment...
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This usually takes a few seconds
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Success State */}
          {status === 'success' && (
            <>
              <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">Payment Successful!</h2>
                <p className="text-muted-foreground">
                  Welcome to <span className="font-medium text-primary">{plan}</span>! 
                  Enjoy all the premium features.
                </p>
              </div>
              <Button onClick={handleContinue} size="lg" className="w-full">
                Continue to App
              </Button>
            </>
          )}

          {/* Cancelled State */}
          {status === 'cancelled' && errorDetails && (
            <>
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
                <XCircle className="h-12 w-12 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">{errorDetails.title}</h2>
                <p className="text-muted-foreground">{errorDetails.message}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleContinue} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
                <Button onClick={handleGoToPricing} className="flex-1">
                  Try Again
                </Button>
              </div>
            </>
          )}

          {/* Failed/Error State */}
          {(status === 'failed' || status === 'error') && errorDetails && (
            <>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
                status === 'error' ? 'bg-amber-500/15' : 'bg-destructive/15'
              }`}>
                {status === 'error' ? (
                  <AlertTriangle className="h-12 w-12 text-amber-500" />
                ) : (
                  <XCircle className="h-12 w-12 text-destructive" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">{errorDetails.title}</h2>
                <p className="text-muted-foreground text-sm">{errorDetails.message}</p>
              </div>
              
              <div className="space-y-3">
                {errorDetails.showRetry && (
                  <Button 
                    onClick={handleRetry} 
                    className="w-full" 
                    disabled={isRetrying}
                  >
                    {isRetrying ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Retry Verification
                  </Button>
                )}
                
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleContinue} className="flex-1">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                  
                  {errorDetails.showSupport && (
                    <Button variant="outline" onClick={handleContactSupport} className="flex-1">
                      <Mail className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Reference info for support */}
              {(searchParams.get('reference') || searchParams.get('tx_ref')) && (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Reference: {searchParams.get('reference') || searchParams.get('tx_ref') || searchParams.get('trxref')}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
