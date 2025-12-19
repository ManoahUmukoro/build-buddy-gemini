import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Calendar, Target, DollarSign, Book, Sparkles, 
  ChevronRight, ChevronLeft, ArrowRight, Loader2, LucideIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingProps {
  onComplete: () => void;
  displayName: string;
}

interface OnboardingStep {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
}

const iconMap: Record<string, LucideIcon> = {
  Sparkles,
  Calendar,
  Target,
  DollarSign,
  Book,
};

export function Onboarding({ onComplete, displayName }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchOnboardingSteps() {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'onboarding_steps')
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data?.value && Array.isArray(data.value)) {
          setSteps(data.value as unknown as OnboardingStep[]);
        }
        // No fallback - if no steps exist in DB, steps array stays empty
      } catch (err) {
        console.error('Error fetching onboarding steps:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOnboardingSteps();
  }, []);

  // If loading, show spinner
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no steps configured in DB, skip onboarding
  if (steps.length === 0) {
    onComplete();
    return null;
  }
  
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const IconComponent = iconMap[step.icon] || Sparkles;
  
  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleSkip = () => {
    onComplete();
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Progress bar */}
      <div className="w-full h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
      
      {/* Skip button */}
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
        >
          Skip
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md mx-auto text-center animate-in">
          {/* Icon */}
          <div className={`w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto mb-6 shadow-lg`}>
            <IconComponent className="text-white" size={36} />
          </div>
          
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {isFirstStep ? `Hey ${displayName}!` : step.title}
          </h1>
          
          {isFirstStep && (
            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
              {step.title}
            </h2>
          )}
          
          <p className="text-primary font-medium mb-4 text-sm md:text-base">
            {step.subtitle}
          </p>
          
          {/* Description */}
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-8 px-2">
            {step.description}
          </p>
          
          {/* Step indicators */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  index === currentStep 
                    ? 'bg-primary w-8' 
                    : index < currentStep 
                      ? 'bg-primary/50' 
                      : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Navigation buttons */}
      <div className="p-6 pb-safe border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-md mx-auto flex gap-3">
          {!isFirstStep && (
            <Button
              variant="outline"
              onClick={handlePrev}
              className="h-12 px-6 rounded-xl"
            >
              <ChevronLeft size={18} className="mr-1" />
              Back
            </Button>
          )}
          
          <Button
            onClick={handleNext}
            className={`flex-1 h-12 rounded-xl font-semibold ${
              isLastStep 
                ? 'bg-gradient-to-r from-primary to-purple-500 hover:opacity-90' 
                : ''
            }`}
          >
            {isLastStep ? (
              <>
                Get Started
                <ArrowRight size={18} className="ml-2" />
              </>
            ) : (
              <>
                Next
                <ChevronRight size={18} className="ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}