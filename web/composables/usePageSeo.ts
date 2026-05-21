import type { MaybeRef } from 'vue'
import { unref } from 'vue'

export interface PageSeoOptions {
  title: MaybeRef<string>
  description?: MaybeRef<string>
  /** Path for canonical (e.g. `/animals/1`). Defaults to current route path. */
  path?: MaybeRef<string>
  image?: MaybeRef<string | undefined>
  noindex?: boolean
  jsonLd?: MaybeRef<Record<string, unknown> | Record<string, unknown>[] | undefined>
}

export function usePageSeo(options: PageSeoOptions) {
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl ?? '').replace(/\/$/, '')
  const route = useRoute()
  const { locale, locales, t } = useI18n()
  const switchLocalePath = useSwitchLocalePath()

  const pagePath = computed(() => {
    const raw = options.path !== undefined ? unref(options.path) : route.path
    return raw.startsWith('/') ? raw : `/${raw}`
  })

  const canonicalUrl = computed(() => `${siteUrl}${pagePath.value}`)

  const ogLocale = computed(() => (locale.value === 'fr' ? 'fr_CA' : 'en_US'))

  const alternateLinks = computed(() => {
    const links: Array<{ rel: string; hreflang: string; href: string }> = []
    for (const loc of locales.value) {
      const hreflang = loc.language ?? loc.code
      const href = `${siteUrl}${switchLocalePath(loc.code)}`
      links.push({ rel: 'alternate', hreflang, href })
    }
    links.push({
      rel: 'alternate',
      hreflang: 'x-default',
      href: `${siteUrl}${switchLocalePath('en')}`,
    })
    return links
  })

  const jsonLdScript = computed(() => {
    const data = options.jsonLd !== undefined ? unref(options.jsonLd) : undefined
    if (!data) {
      return []
    }
    const items = Array.isArray(data) ? data : [data]
    return items.map((entry) => ({
      type: 'application/ld+json',
      children: JSON.stringify(entry),
    }))
  })

  useSeoMeta({
    title: () => unref(options.title),
    description: () => (options.description ? unref(options.description) : undefined),
    ogTitle: () => unref(options.title),
    ogDescription: () => (options.description ? unref(options.description) : undefined),
    ogType: 'website',
    ogUrl: () => canonicalUrl.value,
    ogSiteName: () => t('common.brand'),
    ogLocale: () => ogLocale.value,
    ogImage: () => (options.image ? unref(options.image) : undefined),
    twitterCard: 'summary',
    twitterTitle: () => unref(options.title),
    twitterDescription: () => (options.description ? unref(options.description) : undefined),
    robots: options.noindex ? 'noindex, nofollow' : 'index, follow',
  })

  useHead({
    htmlAttrs: {
      lang: () => (locale.value === 'fr' ? 'fr-CA' : 'en'),
    },
    link: computed(() => [
      { rel: 'canonical', href: canonicalUrl.value },
      ...alternateLinks.value,
    ]),
    script: jsonLdScript,
  })
}
