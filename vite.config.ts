import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// base must match the GitHub Pages subpath (repo name).
export default defineConfig({
  base: '/LearnXRP/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': updates ask the user to reload instead of swapping
      // versions mid-lesson (plan, Section 4).
      registerType: 'prompt',
      manifest: {
        name: 'LearnXRP',
        short_name: 'LearnXRP',
        description: 'Learn robotics with the NanoXRP robot',
        theme_color: '#7c3aed',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
