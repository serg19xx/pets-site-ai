import tailwindcss from '@tailwindcss/vite'

const apiInternal = (process.env.NUXT_API_INTERNAL ?? 'http://127.0.0.1:8080').replace(
  /\/$/,
  '',
)

export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',
  app: {
    head: {
      title: 'PETS Admin',
    },
  },
  telemetry: false,
  devtools: { enabled: false },
  devServer: {
    port: 3001,
    strictPort: true,
  },
  css: ['~/assets/css/main.css'],
  modules: ['@pinia/nuxt'],
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: apiInternal,
          changeOrigin: true,
        },
      },
    },
  },
  runtimeConfig: {
    apiInternal: process.env.NUXT_API_INTERNAL ?? 'http://127.0.0.1:8080',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? '',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      adminUrl: process.env.NUXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001',
    },
  },
  nitro: {
    devProxy: {
      '/api': {
        target: `${apiInternal}/api`,
        changeOrigin: true,
      },
    },
  },
  routeRules: {
    '/api/**': { proxy: `${apiInternal}/api/**` },
    '/**': { ssr: false },
  },
})
