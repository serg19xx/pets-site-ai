<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

usePageSeo({
  title: computed(() => t('meta.consultations.title')),
  description: computed(() => t('meta.consultations.description')),
  path: computed(() => localePath('/consultations')),
})

const plannedItems = ['catalog', 'profile', 'appointment', 'materials'] as const
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

    <section class="mt-8">
      <h2 class="ui-section-title">{{ $t('consultations.plannedTitle') }}</h2>
      <ul class="ui-body mt-3 list-disc space-y-2 pl-5">
        <li v-for="item in plannedItems" :key="item">
          {{ $t(`consultations.planned.${item}`) }}
        </li>
      </ul>
    </section>

    <p class="ui-page-subtitle mt-8">
      <i18n-t keypath="consultations.feedbackHint" tag="span">
        <template #feedback>
          <NuxtLink :to="localePath('/app/feedback')" class="ui-link">
            {{ $t('auth.feedback') }}
          </NuxtLink>
        </template>
        <template #contact>
          <NuxtLink :to="localePath('/contact')" class="ui-link">
            {{ $t('nav.contact') }}
          </NuxtLink>
        </template>
      </i18n-t>
    </p>

    <p class="ui-page-subtitle mt-4">
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
