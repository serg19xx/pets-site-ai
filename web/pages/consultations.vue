<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

usePageSeo({
  title: computed(() => t('meta.consultations.title')),
  description: computed(() => t('meta.consultations.description')),
  path: computed(() => localePath('/consultations')),
})
</script>

<template>
  <section class="ui-page-container mx-auto max-w-2xl">
    <header class="mb-6">
      <h1 class="ui-page-title">{{ $t('consultations.title') }}</h1>
      <p class="ui-page-subtitle mt-1">{{ $t('consultations.subtitle') }}</p>
    </header>

    <UnderConstructionPanel
      :title="$t('consultations.panelTitle')"
      :purpose="$t('consultations.panelPurpose')"
    />

    <p class="ui-page-subtitle mt-8">
      <i18n-t keypath="consultations.learnHint" tag="span">
        <template #learn>
          <NuxtLink :to="localePath('/learn')" class="ui-link">
            {{ $t('nav.learn') }}
          </NuxtLink>
        </template>
      </i18n-t>
    </p>
  </section>
</template>
