import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LifeCommandCenter from '@/components/LifeCommandCenter';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mx-auto mb-4" size={40} />
          <p className="text-muted-foreground">Loading your command center...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <LifeCommandCenter />;
};

export default Index;
