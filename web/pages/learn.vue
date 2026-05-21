<script setup lang="ts">
const { t } = useI18n()

usePageSeo({
  title: computed(() => t('meta.learn.title')),
  description: computed(() => t('meta.learn.description')),
})
</script>

<template>
  <section>
    <h1 class="ui-page-title">{{ $t('learn.title') }}</h1>
    <p class="ui-page-subtitle mt-2">
      {{ $t('learn.subtitle') }}
    </p>
  </section>
</template>
