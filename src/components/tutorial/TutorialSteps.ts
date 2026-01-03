import { Step } from 'react-joyride';

export const MAIN_TUTORIAL_ID = 'main_tour';

export const mainTutorialSteps: Step[] = [
  {
    target: '[data-tutorial="dashboard"]',
    content: 'Welcome to LifeOS! This is your command center. Here you can see an overview of your tasks, habits, and finances.',
    title: 'Your Dashboard',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="tasks"]',
    content: 'Add and manage your daily tasks here. Use the + button to create new tasks, and check them off as you complete them.',
    title: 'Task Management',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="systems"]',
    content: 'Systems are your goals with attached habits. Create a system like "Get Fit" and add habits like "Exercise 30 min daily".',
    title: 'Goals & Habits',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="finance"]',
    content: 'Track your income and expenses here. You can also import bank statements and see spending analytics.',
    title: 'Finance Tracking',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="journal"]',
    content: 'Reflect on your day with journal entries. Track your mood and write about your wins and improvements.',
    title: 'Daily Journal',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="fab"]',
    content: 'Quick actions are just a tap away! Use this button to quickly add tasks, transactions, or start a focus session.',
    title: 'Quick Actions',
    placement: 'top',
  },
  {
    target: '[data-tutorial="ai-features"]',
    content: 'AI-powered features help you work smarter. Smart Sort prioritizes your tasks, and AI Chat gives personalized insights. These features require Pro.',
    title: 'AI Features (Pro)',
    placement: 'bottom',
  },
];

export const financeTutorialSteps: Step[] = [
  {
    target: '[data-tutorial="account-selector"]',
    content: 'Select which bank account to view. You can add multiple accounts and see balances for each.',
    title: 'Account Selection',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="balance-cards"]',
    content: 'See your income, expenses, and balance at a glance. Click on a card to filter transactions.',
    title: 'Balance Overview',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="safe-daily-spend"]',
    content: 'This calculates how much you can safely spend each day based on your income, expenses, and savings goals.',
    title: 'Safe Daily Spend',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="import-statement"]',
    content: 'Import bank statements from PDF, CSV, or Excel files. Transactions are automatically parsed and categorized.',
    title: 'Import Statements',
    placement: 'left',
  },
];

export const getTutorialSteps = (tutorialId: string): Step[] => {
  switch (tutorialId) {
    case MAIN_TUTORIAL_ID:
      return mainTutorialSteps;
    case 'finance_tour':
      return financeTutorialSteps;
    default:
      return mainTutorialSteps;
  }
};
