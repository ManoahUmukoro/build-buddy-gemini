import { useAuth } from '@/hooks/useAuth';
import LifeCommandCenter from '@/components/LifeCommandCenter';
import LandingPage from '@/components/LandingPage';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mx-auto mb-4" size={40} />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  if (!user) {
    return <LandingPage />;
  }

  // Show app for authenticated users
  return <LifeCommandCenter />;
};

export default Index;
