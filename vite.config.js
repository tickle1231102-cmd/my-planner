import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudApiDevPlugin } from './vite.cloudApi.js'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

function landingDevRoutesPlugin() {
  return {
    name: 'landing-dev-routes',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? ''
        if (url === '/app' || url.startsWith('/app?')) {
          req.url = `/app.html${url.slice(4)}`
        } else if (url === '/privacy' || url.startsWith('/privacy?')) {
          req.url = `/privacy.html${url.slice(8)}`
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [react(), tailwindcss(), cloudApiDevPlugin(), landingDevRoutesPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        app: resolve(rootDir, 'app.html'),
        privacy: resolve(rootDir, 'privacy.html'),
      },
    },
  },
})
