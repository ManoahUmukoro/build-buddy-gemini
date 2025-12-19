import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Calendar, Target, DollarSign, Book, Sparkles, 
  ChevronRight, ChevronLeft, Check, ArrowRight
} from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
  displayName: string;
}

const steps = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Welcome to LifeOS',
    subtitle: 'Your personal command center',
    description: 'LifeOS helps you organize your life, track your habits, manage finances, and grow as a person. Let\'s take a quick tour!',
    color: 'from-primary to-purple-500',
  },
  {
    id: 'planner',
    icon: Calendar,
    title: 'Daily Planner',
    subtitle: 'Stay on top of your tasks',
    description: 'Plan your day with tasks, set times for reminders, and check them off as you complete them. Never miss an important deadline again.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'systems',
    icon: Target,
    title: 'Systems & Habits',
    subtitle: 'Build consistency',
    description: 'Create systems for your goals and track daily habits. Watch your streaks grow as you build the life you want, one day at a time.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'finance',
    icon: DollarSign,
    title: 'Finance Tracker',
    subtitle: 'Master your money',
    description: 'Track income and expenses, set budgets using the 50/30/20 rule, and work towards your savings goals. Scan receipts with AI!',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    id: 'journal',
    icon: Book,
    title: 'Reflection Journal',
    subtitle: 'Grow through reflection',
    description: 'Daily mood tracking, wins, and areas to improve. Build self-awareness and watch your progress over time with weekly summaries.',
    color: 'from-pink-500 to-rose-500',
  },
];

export function Onboarding({ onComplete, displayName }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  
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
            <step.icon className="text-white" size={36} />
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
