<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: computed(() => t('meta.learn.title')),
  description: computed(() => t('meta.learn.description')),
})
</script>

<template>
  <section class="ui-page">
    <header class="ui-page-header">
      <h1 class="ui-page-title">{{ $t('learn.title') }}</h1>
      <p class="ui-page-subtitle">{{ $t('learn.subtitle') }}</p>
    </header>

    <div class="flex flex-col gap-6">
      <UnderConstructionPanel
        :title="$t('learn.articlesTitle')"
        :purpose="$t('learn.articlesPurpose')"
      />
      <UnderConstructionPanel
        :title="$t('learn.consultationsTitle')"
        :purpose="$t('learn.consultationsPurpose')"
      />
    </div>
  </section>
</template>
