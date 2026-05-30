<script setup lang="ts">
const { t } = useI18n()
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl).replace(/\/$/, '')

usePageSeo({
  title: computed(() => t('meta.home.title')),
  description: computed(() => t('meta.home.description')),
  jsonLd: computed(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: t('common.brand'),
    url: siteUrl,
    description: t('meta.home.description'),
    inLanguage: ['en', 'fr-CA'],
  })),
})
</script>

<template>
  <section class="ui-page-container">
    <header class="mb-4">
      <h1 class="ui-page-title">{{ $t('home.title') }}</h1>
      <p class="ui-page-subtitle mt-1">
        {{ $t('home.subtitle') }}
      </p>
    </header>

    <GalleryGrid />
  </section>
</template>
