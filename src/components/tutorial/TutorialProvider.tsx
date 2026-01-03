import { ReactNode, useState, useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, Step } from 'react-joyride';
import { useTutorial } from '@/hooks/useTutorial';
import { getTutorialSteps, MAIN_TUTORIAL_ID } from './TutorialSteps';
import { useAuth } from '@/hooks/useAuth';

interface TutorialProviderProps {
  children: ReactNode;
  tutorialId?: string;
  autoStart?: boolean;
}

// Custom tooltip styles for OLED dark theme
const joyrideStyles = {
  options: {
    backgroundColor: 'hsl(var(--card))',
    textColor: 'hsl(var(--foreground))',
    primaryColor: 'hsl(var(--primary))',
    arrowColor: 'hsl(var(--card))',
    overlayColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 10000,
  },
  buttonNext: {
    backgroundColor: 'hsl(var(--primary))',
    color: 'hsl(var(--primary-foreground))',
    borderRadius: '8px',
    fontSize: '14px',
    padding: '8px 16px',
  },
  buttonBack: {
    color: 'hsl(var(--muted-foreground))',
    marginRight: '8px',
  },
  buttonSkip: {
    color: 'hsl(var(--muted-foreground))',
  },
  buttonClose: {
    display: 'none',
  },
  tooltip: {
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    border: '1px solid hsl(var(--border))',
  },
  tooltipTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  tooltipContent: {
    fontSize: '14px',
    lineHeight: 1.6,
  },
  spotlight: {
    borderRadius: '8px',
  },
};

export function TutorialProvider({ 
  children, 
  tutorialId = MAIN_TUTORIAL_ID,
  autoStart = false,
}: TutorialProviderProps) {
  const { user } = useAuth();
  const { 
    isRunning, 
    setIsRunning, 
    currentStep,
    isCompleted,
    updateStep, 
    completeTutorial,
    startTutorial,
  } = useTutorial(tutorialId);

  const [stepIndex, setStepIndex] = useState(currentStep);
  const steps = getTutorialSteps(tutorialId);

  // Auto-start for new users if enabled
  // Disabled by default - tutorials start from help tab or settings

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, index, action } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setIsRunning(false);
      completeTutorial();
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      const nextIndex = index + (action === 'prev' ? -1 : 1);
      setStepIndex(nextIndex);
      updateStep(nextIndex);
    }
  }, [setIsRunning, completeTutorial, updateStep]);

  // Don't render tutorial if not logged in
  if (!user) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <Joyride
        steps={steps}
        run={isRunning}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        hideCloseButton
        scrollToFirstStep
        spotlightClicks
        disableOverlayClose
        styles={joyrideStyles}
        callback={handleJoyrideCallback}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip Tour',
        }}
      />
    </>
  );
}

// Export a hook to trigger tutorial from anywhere
export function useTutorialTrigger(tutorialId: string = MAIN_TUTORIAL_ID) {
  const tutorial = useTutorial(tutorialId);
  
  const startTour = async () => {
    await tutorial.startTutorial();
    tutorial.setIsRunning(true);
  };

  return {
    startTour,
    isCompleted: tutorial.isCompleted,
    resetTour: tutorial.resetTutorial,
  };
}
