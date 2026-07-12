/* Focal Web Push service worker */

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {
    title: 'Focal',
    body: '오늘 미완료 할 일을 확인해 보세요.',
    url: '/?view=weekly',
    tag: 'focal-reminder',
  }

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() }
    }
  } catch {
    try {
      const text = event.data?.text()
      if (text) data.body = text
    } catch {
      // keep defaults
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Focal', {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'focal-reminder',
      renotify: true,
      data: { url: data.url || '/?view=weekly' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification?.data?.url || '/?view=weekly'
  const absoluteUrl = new URL(targetUrl, self.location.origin).href

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      for (const client of clientList) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            await client.navigate(absoluteUrl)
          }
          return
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(absoluteUrl)
      }
    })(),
  )
})
