// LifeOS Service Worker for Push Notifications

const CACHE_NAME = 'lifeos-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'LifeOS Reminder',
    body: 'Time to check your daily progress!',
    icon: '/lifeos-logo.png',
    badge: '/lifeos-logo.png',
    tag: 'lifeos-reminder',
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/lifeos-logo.png',
    badge: data.badge || '/lifeos-logo.png',
    tag: data.tag || 'lifeos-notification',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open', title: 'Open LifeOS' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle scheduled notifications (using periodic sync if available)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-checkin') {
    event.waitUntil(showDailyCheckinNotification());
  }
});

async function showDailyCheckinNotification() {
  const options = {
    body: 'Have you checked off your Systems and Goals for today?',
    icon: '/lifeos-logo.png',
    badge: '/lifeos-logo.png',
    tag: 'daily-checkin',
    vibrate: [100, 50, 100],
    data: { url: '/' },
    requireInteraction: true,
  };
  
  return self.registration.showNotification('LifeOS Daily Check-in', options);
}
