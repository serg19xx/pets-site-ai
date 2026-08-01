<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: computed(() => t('meta.consultations.title')),
  description: computed(() => t('meta.consultations.description')),
})
</script>

<template>
  <section class="ui-page">
    <header class="ui-page-header">
      <h1 class="ui-page-title">{{ $t('consultations.title') }}</h1>
      <p class="ui-page-subtitle">{{ $t('consultations.subtitle') }}</p>
    </header>

    <UnderConstructionPanel
      :title="$t('learn.consultationsTitle')"
      :purpose="$t('learn.consultationsPurpose')"
    />
  </section>
</template>
