import { defineConfig } from 'astro/config'
import { loadEnv } from 'vite'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'

const env = loadEnv('', new URL('.', import.meta.url).pathname, 'PUBLIC_')

export default defineConfig({
  integrations: [react(), tailwind()],
  output: 'static',
  vite: {
    define: {
      'import.meta.env.PUBLIC_API_URL': JSON.stringify(env.PUBLIC_API_URL ?? 'http://localhost:3001'),
    },
  },
})
