import cloudflare from '@astrojs/cloudflare'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import { defineConfig } from 'astro/config'

export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare(),
  integrations: [react(), mdx()],
})
