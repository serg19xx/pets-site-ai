<script setup lang="ts">
const { t } = useI18n()

usePageSeo({
  title: computed(() => t('meta.feed.title')),
  description: computed(() => t('meta.feed.description')),
})
</script>

<template>
  <section>
    <h1 class="ui-page-title">{{ $t('feed.title') }}</h1>
    <p class="ui-page-subtitle mt-2">
      {{ $t('feed.subtitle') }}
    </p>
  </section>
</template>
