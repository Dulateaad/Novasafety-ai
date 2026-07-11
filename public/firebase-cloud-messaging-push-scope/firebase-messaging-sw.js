/* global importScripts, firebase, clients */
// FCM service worker — отдельный scope от Workbox PWA (см. src/lib/push.ts).

importScripts(
  'https://www.gstatic.com/firebasejs/12.12.1/firebase-app-compat.js',
)
importScripts(
  'https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging-compat.js',
)

const params = new URL(self.location).searchParams

firebase.initializeApp({
  apiKey: params.get('apiKey') || undefined,
  projectId: params.get('projectId') || undefined,
  messagingSenderId: params.get('messagingSenderId') || undefined,
  appId: params.get('appId') || undefined,
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {}
  const title = data.title || 'NOVA SAFETY AI'
  const url = data.permitId ? `/p/${data.permitId}` : '/'
  self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/nova-icon-192.png',
    badge: '/nova-icon-192.png',
    tag: data.permitId || 'nova-notice',
    data: { url },
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          if ('navigate' in client) {
            try {
              client.navigate(target)
            } catch {
              /* navigate может быть запрещён на кросс-скоупе */
            }
          }
          return client.focus()
        }
      }
      return clients.openWindow(target)
    }),
  )
})
