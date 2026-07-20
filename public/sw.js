/* Focal Web Push service worker — v2 */

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

function weeklyUrl() {
  return new URL('/app?view=weekly', self.location.origin).href
}

self.addEventListener('push', (event) => {
  let data = {
    title: 'Focal',
    body: '오늘 미완료 할 일을 확인해 보세요.',
    url: '/app?view=weekly',
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

  const targetUrl = data.url || '/app?view=weekly'

  event.waitUntil(
    self.registration.showNotification(data.title || 'Focal', {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'focal-reminder',
      renotify: true,
      data: { url: targetUrl },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification?.data?.url || '/app?view=weekly'
  const absoluteUrl = new URL(targetUrl, self.location.origin).href

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url)
          if (clientUrl.origin !== self.location.origin) continue
        } catch {
          continue
        }

        // Ask the open app to hard-navigate to Weekly (SPA focus alone keeps old view).
        client.postMessage({
          type: 'FOCAL_OPEN_WEEKLY',
          url: absoluteUrl,
        })

        if ('focus' in client) {
          await client.focus()
        }

        if ('navigate' in client) {
          try {
            await client.navigate(absoluteUrl)
          } catch {
            // iOS / some PWAs do not support navigate(); postMessage handles it.
          }
        }

        return
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(absoluteUrl)
      }
    })(),
  )
})
