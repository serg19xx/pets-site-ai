<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl).replace(/\/$/, '')

usePageSeo({
  title: computed(() => t('meta.animals.title')),
  description: computed(() => t('meta.animals.description')),
  jsonLd: computed(() => ({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('gallery.title'),
    url: `${siteUrl}${localePath('/gallery')}`,
    description: t('meta.animals.description'),
    isPartOf: {
      '@type': 'WebSite',
      name: t('common.brand'),
      url: siteUrl,
    },
  })),
})
</script>

<template>
  <section class="ui-page-container ui-gallery-page">
    <header class="ui-gallery-page-header mb-6">
      <p class="ui-gallery-page-kicker">{{ $t('gallery.kicker') }}</p>
      <h1 class="ui-page-title">{{ $t('gallery.title') }}</h1>
      <p class="ui-page-subtitle mt-2">
        {{ $t('gallery.subtitle') }}
      </p>
    </header>

    <GalleryGrid />
  </section>
</template>
