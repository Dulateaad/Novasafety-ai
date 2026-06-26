/* global importScripts, firebase, clients */
// Фоновый service worker для FCM web-push (отдельный от Workbox-SW приложения).
// Конфиг Firebase передаётся через query-параметры при регистрации из src/lib/push.ts.

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

// Сообщения отправляются data-only, поэтому уведомление строим сами —
// это исключает дублирование (авто-показ + onBackgroundMessage).
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {}
  const title = data.title || 'NOVA Safety'
  const url = data.permitId ? `/p/${data.permitId}` : '/'
  self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
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
            } catch (e) {
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
