self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('push', event => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (err) {
      console.error('Failed to parse push event data as JSON:', err);
    }
  }
  const title = typeof data.title === 'string' && data.title.trim() !== '' ? data.title : 'New message';
  const options = {
    body: typeof data.body === 'string' ? data.body : '',
    icon: '/favicon.ico',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
