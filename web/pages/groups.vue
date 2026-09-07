<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

usePageSeo({
  title: computed(() => t('meta.groups.title')),
  description: computed(() => t('meta.groups.description')),
  path: computed(() => localePath('/groups')),
})

const plannedItems = ['theme', 'create', 'discover', 'myGroups'] as const
</script>

<template>
  <section class="ui-page-container mx-auto max-w-2xl">
    <header class="mb-6">
      <h1 class="ui-page-title">{{ $t('groups.title') }}</h1>
      <p class="ui-page-subtitle mt-1">{{ $t('groups.subtitle') }}</p>
    </header>

    <UnderConstructionPanel
      :title="$t('groups.panelTitle')"
      :purpose="$t('groups.panelPurpose')"
    />

    <section class="mt-8">
      <h2 class="ui-section-title">{{ $t('groups.plannedTitle') }}</h2>
      <ul class="ui-body mt-3 list-disc space-y-2 pl-5">
        <li v-for="item in plannedItems" :key="item">
          {{ $t(`groups.planned.${item}`) }}
        </li>
      </ul>
    </section>

    <p class="ui-page-subtitle mt-8">
      <i18n-t keypath="groups.feedbackHint" tag="span">
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
  </section>
</template>
