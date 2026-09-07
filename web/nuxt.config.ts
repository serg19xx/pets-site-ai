import tailwindcss from '@tailwindcss/vite'

const apiInternal = (process.env.NUXT_API_INTERNAL ?? 'http://127.0.0.1:8080').replace(
  /\/$/,
  '',
)

export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/webp', href: '/brand/logo-circle.webp' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@500;600;700;800&display=swap',
        },
      ],
    },
  },
  telemetry: false,
  devtools: { enabled: false },
  devServer: {
    port: 3000,
    strictPort: true,
  },
  css: ['~/assets/css/main.css'],
  modules: ['@pinia/nuxt', '@nuxtjs/i18n'],
  i18n: {
    restructureDir: false,
    locales: [
      { code: 'en', language: 'en', name: 'English', file: 'en.json' },
      { code: 'fr', language: 'fr-CA', name: 'Français', file: 'fr.json' },
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    lazy: true,
    langDir: 'locales',
    bundle: {
      optimizeTranslationDirective: false,
    },
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'pets_locale',
      redirectOn: 'root',
      fallbackLocale: 'en',
    },
    vueI18n: './i18n.config.ts',
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: apiInternal,
          changeOrigin: true,
        },
      },
      watch: {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.nuxt/**',
          '**/.output/**',
          '../backend/**',
          '../agents/**',
          '../docker/**',
          '../docs/**',
        ],
      },
    },
  },
  runtimeConfig: {
    apiInternal: process.env.NUXT_API_INTERNAL ?? 'http://127.0.0.1:8080',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? '',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      /** Default header logo: `wide` (horizontal) or `circle`. Override with `?brand=wide|circle`. */
      brandLogo: process.env.NUXT_PUBLIC_BRAND_LOGO ?? 'wide',
      adminUrl: process.env.NUXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001',
      /** Show Regenerate greeting button. Off by default (OpenAI cost). */
      greetingRegenerateEnabled:
        process.env.NUXT_PUBLIC_GREETING_REGENERATE_ENABLED === 'true',
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
    // Proxy API in preview/production (devProxy only applies to `nuxt dev`)
    '/api/**': { proxy: `${apiInternal}/api/**` },
    // Feed is /feed (label matches path). Root and legacy /animals keep working via redirects.
    '/': { redirect: '/feed' },
    '/feed': { ssr: false },
    '/fr': { redirect: '/fr/feed' },
    '/fr/feed': { ssr: false },
    '/animals': { redirect: '/gallery' },
    '/animals/:id': { redirect: '/gallery/:id' },
    '/fr/animals': { redirect: '/fr/gallery' },
    '/fr/animals/:id': { redirect: '/fr/gallery/:id' },
    '/marketplace': { ssr: false },
    '/marketplace/**': { ssr: false },
    // SSR (not prerender): locale switch stays client-side without a hard HTML swap.
    '/learn': { ssr: true },
    '/learn/**': { ssr: true },
    '/consultations': { ssr: true },
    '/groups': { ssr: true },
    '/login': { ssr: true },
    '/invite': { ssr: true },
    '/contact': { ssr: true },
    '/faq': { ssr: true },
    '/fr/marketplace': { ssr: false },
    '/fr/marketplace/**': { ssr: false },
    '/fr/learn': { ssr: true },
    '/fr/learn/**': { ssr: true },
    '/fr/consultations': { ssr: true },
    '/fr/groups': { ssr: true },
    '/fr/login': { ssr: true },
    '/fr/invite': { ssr: true },
    '/fr/contact': { ssr: true },
    '/fr/faq': { ssr: true },
    '/gallery': { ssr: true },
    '/gallery/**': { ssr: true },
    '/fr/gallery': { ssr: true },
    '/fr/gallery/**': { ssr: true },
    '/app/**': { ssr: false },
    '/sitemap.xml': { prerender: false },
  },
})
