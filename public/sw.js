self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('push', event => {
  let data = {
    title: 'New message',
    body: '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'default'
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
    } catch (err) {
      console.error('Failed to parse push event data as JSON:', err);
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    requireInteraction: false,
    silent: false
  };
  
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  // Handle different notification types
  const notificationData = event.notification.data;
  let targetUrl = '/';
  
  if (notificationData) {
    switch (notificationData.type) {
      case 'dm-message':
        // Navigate to DMs page
        targetUrl = '/?page=dms';
        break;
      case 'new-message':
        // Navigate to group chat
        targetUrl = '/?page=group-chat';
        break;
      default:
        targetUrl = '/';
    }
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          // Focus the existing window and navigate to the target URL
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: notificationData,
            targetUrl: targetUrl
          });
          return client.focus();
        }
      }
      
      // No existing window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
