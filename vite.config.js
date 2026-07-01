import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudApiDevPlugin } from './vite.cloudApi.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudApiDevPlugin()],
})
