// LifeOS Notification Scheduler
// Handles daily check-in notifications using Service Worker

const DAILY_CHECKIN_HOUR = 20; // 8:00 PM
const DAILY_CHECKIN_MINUTE = 0;

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledTime: Date;
  recurring: boolean;
}

// Register the service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return 'denied';
  }
  
  // Check current permission
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  
  // Request permission
  const permission = await Notification.requestPermission();
  return permission;
}

// Schedule the daily check-in notification
export async function scheduleDailyCheckin(): Promise<boolean> {
  const registration = await registerServiceWorker();
  if (!registration) return false;
  
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return false;
  
  // Store the schedule in localStorage
  const scheduleKey = 'lifeos_daily_checkin_schedule';
  localStorage.setItem(scheduleKey, JSON.stringify({
    enabled: true,
    hour: DAILY_CHECKIN_HOUR,
    minute: DAILY_CHECKIN_MINUTE,
    lastNotified: null,
  }));
  
  // Start the notification check interval
  startNotificationChecker();
  
  return true;
}

// Check if it's time to show a notification
function shouldShowNotification(schedule: any): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Check if we're within the notification window (8:00 PM - 8:05 PM)
  if (currentHour !== schedule.hour) return false;
  if (currentMinute < schedule.minute || currentMinute > schedule.minute + 5) return false;
  
  // Check if we already notified today
  if (schedule.lastNotified) {
    const lastDate = new Date(schedule.lastNotified);
    if (
      lastDate.getDate() === now.getDate() &&
      lastDate.getMonth() === now.getMonth() &&
      lastDate.getFullYear() === now.getFullYear()
    ) {
      return false;
    }
  }
  
  return true;
}

// Show the daily check-in notification
async function showDailyCheckinNotification(): Promise<void> {
  if (Notification.permission !== 'granted') return;
  
  const registration = await navigator.serviceWorker.ready;
  
  await registration.showNotification('LifeOS Daily Check-in', {
    body: 'Have you checked off your Systems and Goals for today?',
    icon: '/lifeos-logo.png',
    badge: '/lifeos-logo.png',
    tag: 'daily-checkin',
    data: { url: '/' },
    requireInteraction: true,
  });
  
  // Update lastNotified
  const scheduleKey = 'lifeos_daily_checkin_schedule';
  const schedule = JSON.parse(localStorage.getItem(scheduleKey) || '{}');
  schedule.lastNotified = new Date().toISOString();
  localStorage.setItem(scheduleKey, JSON.stringify(schedule));
}

// Notification check interval
let notificationCheckInterval: NodeJS.Timeout | null = null;

export function startNotificationChecker(): void {
  if (notificationCheckInterval) return;
  
  // Check every minute
  notificationCheckInterval = setInterval(() => {
    const scheduleKey = 'lifeos_daily_checkin_schedule';
    const scheduleStr = localStorage.getItem(scheduleKey);
    if (!scheduleStr) return;
    
    try {
      const schedule = JSON.parse(scheduleStr);
      if (schedule.enabled && shouldShowNotification(schedule)) {
        showDailyCheckinNotification();
      }
    } catch (e) {
      console.error('Error checking notification schedule:', e);
    }
  }, 60000); // Check every minute
  
  // Also check immediately
  const scheduleStr = localStorage.getItem('lifeos_daily_checkin_schedule');
  if (scheduleStr) {
    try {
      const schedule = JSON.parse(scheduleStr);
      if (schedule.enabled && shouldShowNotification(schedule)) {
        showDailyCheckinNotification();
      }
    } catch (e) {
      // Ignore
    }
  }
}

export function stopNotificationChecker(): void {
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
    notificationCheckInterval = null;
  }
}

// Show a test notification
export async function showTestNotification(): Promise<void> {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }
  
  const registration = await navigator.serviceWorker.ready;
  
  await registration.showNotification('LifeOS Test', {
    body: 'Notifications are working! You\'ll receive daily reminders at 8:00 PM.',
    icon: '/lifeos-logo.png',
    badge: '/lifeos-logo.png',
    tag: 'test-notification',
  });
}

// Initialize notifications on app load
export function initializeNotifications(): void {
  const scheduleStr = localStorage.getItem('lifeos_daily_checkin_schedule');
  if (scheduleStr) {
    try {
      const schedule = JSON.parse(scheduleStr);
      if (schedule.enabled) {
        registerServiceWorker().then(() => {
          startNotificationChecker();
        });
      }
    } catch (e) {
      // Ignore
    }
  }
}
