import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, LogOut } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';

export default function Auth() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpType, setOtpType] = useState<'signup' | 'password_reset'>('signup');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const sendVerificationCode = async (type: 'signup' | 'password_reset') => {
    const { data, error } = await supabase.functions.invoke('send-verification-code', {
      body: { email, type, displayName: displayName.trim() || undefined }
    });

    if (error) {
      console.error('Send verification code error:', error);
      throw new Error(error.message || 'Failed to send verification code');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  };

  const verifyCode = async (code: string, type: 'signup' | 'password_reset') => {
    const { data, error } = await supabase.functions.invoke('verify-code', {
      body: { email, code, type }
    });

    if (error) {
      console.error('Verify code error:', error);
      throw new Error(error.message || 'Verification failed');
    }

    if (data?.error || !data?.valid) {
      throw new Error(data?.error || 'Invalid verification code');
    }

    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back!');
      } else {
        if (!displayName.trim()) {
          toast.error('Please enter your name');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        // Send custom verification code via our edge function
        await sendVerificationCode('signup');
        
        setOtpType('signup');
        setShowOtpInput(true);
        toast.success('Verification code sent to your email!');
      }
    } catch (error: any) {
      const message = error.message?.toLowerCase() || '';
      if (message.includes('invalid login') || message.includes('invalid credentials')) {
        toast.error('Invalid email or password. Please try again.');
      } else if (message.includes('network') || message.includes('fetch')) {
        toast.error('Connection issue. Please check your internet and try again.');
      } else if (message.includes('rate limit')) {
        toast.error('Too many attempts. Please wait a moment and try again.');
      } else {
        toast.error(error.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setLoading(true);

    try {
      await sendVerificationCode('password_reset');
      setOtpType('password_reset');
      setShowOtpInput(true);
      setShowForgotPassword(false);
      toast.success('Password reset code sent to your email!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify the code using our custom edge function
      await verifyCode(otp, otpType);

      if (otpType === 'signup') {
        // Code verified - now create the user account
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: displayName.trim() }
          }
        });

        if (signupError) throw signupError;

        if (signupData.user) {
          // Create profile immediately
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              user_id: signupData.user.id,
              display_name: displayName.trim()
            }, { onConflict: 'user_id' });

          if (profileError) {
            console.error('Profile creation error:', profileError);
          }

          toast.success('Account created successfully!');
          
          // Auto-login after signup (auto-confirm is enabled)
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (loginError) {
            console.log('Auto-login failed:', loginError);
            toast.info('Account created! Please sign in.');
            setShowOtpInput(false);
            setIsLogin(true);
          } else {
            navigate('/');
          }
        }
      } else if (otpType === 'password_reset') {
        // Password reset flow - show password reset form
        setShowOtpInput(false);
        setShowResetPassword(true);
        toast.success('Code verified! Enter your new password.');
      }
    } catch (error: any) {
      if (error.message?.includes('expired')) {
        toast.error('Verification code has expired. Please request a new one.');
      } else if (error.message?.includes('invalid') || error.message?.includes('Invalid')) {
        toast.error('Invalid verification code. Please try again.');
      } else {
        toast.error(error.message || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);

    try {
      // Use Supabase password reset with magic link approach
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        // If user is not logged in, we need a different approach
        // Since we verified OTP, we'll sign them up with new password
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: newPassword
        });
        
        if (signInError) {
          throw new Error('Unable to update password. Please try signing up again.');
        }
      }
      
      toast.success('Password updated! Redirecting...');
      setShowResetPassword(false);
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await sendVerificationCode(otpType);
      toast.success('New verification code sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error: any) {
      toast.error('Failed to sign out');
    }
  };

  // Show sign out option if user is somehow on auth page while logged in
  if (user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <Logo size="xl" showText={false} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">You're already signed in</h1>
          <p className="text-muted-foreground mb-6">
            Signed in as <strong className="text-foreground">{user.email}</strong>
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate('/')}
              className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold"
            >
              Go to Dashboard
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full h-12 rounded-xl font-bold"
            >
              <LogOut className="mr-2" size={18} />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Password reset form (after OTP verified)
  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size="xl" showText={false} />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Set New Password</h1>
            <p className="text-muted-foreground text-sm">
              Enter a new password for <strong className="text-foreground">{email}</strong>
            </p>
          </div>

          <div className="bg-card border border-border rounded-3xl p-8 shadow-card">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-xs font-bold text-muted-foreground uppercase">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 h-12 bg-muted border-0 rounded-xl"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || newPassword.length < 6}
                className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  setNewPassword('');
                  setIsLogin(true);
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Forgot password form
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size="xl" showText={false} />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Forgot Password</h1>
            <p className="text-muted-foreground text-sm">
              Enter your email and we'll send you a reset code
            </p>
          </div>

          <div className="bg-card border border-border rounded-3xl p-8 shadow-card">
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail" className="text-xs font-bold text-muted-foreground uppercase">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    id="resetEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 h-12 bg-muted border-0 rounded-xl"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Sending code...
                  </>
                ) : (
                  'Send Reset Code'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showOtpInput) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size="xl" showText={false} />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h1>
            <p className="text-muted-foreground text-sm">
              We sent a 6-digit verification code to <strong className="text-foreground">{email}</strong>
            </p>
          </div>

          <div className="bg-card border border-border rounded-3xl p-8 shadow-card">
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-xs font-bold text-muted-foreground uppercase">
                  Verification Code
                </Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="h-12 bg-muted border-0 rounded-xl text-center text-lg tracking-widest font-mono"
                  maxLength={6}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Verifying...
                  </>
                ) : otpType === 'signup' ? (
                  'Verify & Create Account'
                ) : (
                  'Verify Code'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center space-y-2">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-sm text-primary hover:underline"
              >
                Didn't receive the code? Resend
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpInput(false);
                    setOtp('');
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to {otpType === 'signup' ? 'sign up' : 'forgot password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="xl" showText={false} />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">LifeOS</h1>
          <p className="text-muted-foreground">The Operating System for Intentional Living</p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-8 shadow-card">
          <div className="flex gap-2 mb-6 p-1 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                isLogin ? 'bg-card shadow-soft text-foreground' : 'text-muted-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                !isLogin ? 'bg-card shadow-soft text-foreground' : 'text-muted-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-xs font-bold text-muted-foreground uppercase">
                  Your Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="pl-10 h-12 bg-muted border-0 rounded-xl"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold text-muted-foreground uppercase">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 h-12 bg-muted border-0 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-bold text-muted-foreground uppercase">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 h-12 bg-muted border-0 rounded-xl"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  {isLogin ? 'Signing in...' : 'Sending code...'}
                </>
              ) : (
                <>
                  <User className="mr-2" size={18} />
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </Button>
          </form>
        </div>
        
        {/* Mobile branding */}
        <p className="md:hidden text-center text-xs text-muted-foreground mt-6">
          Powered by Webnexer
        </p>
      </div>
    </div>
  );
}
