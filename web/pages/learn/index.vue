<script setup lang="ts">
import {
  LEARN_GUIDES,
  learnSpeciesWithGuides,
  learnGuidesForSpecies,
  type LearnSpecies,
} from '~/data/learn-guides'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'

const { t } = useI18n()
const localePath = useLocalePath()

usePageSeo({
  title: computed(() => t('meta.learn.title')),
  description: computed(() => t('meta.learn.description')),
  path: computed(() => localePath('/learn')),
})

const speciesOnPage = computed(() => learnSpeciesWithGuides())

function guidesIn(species: LearnSpecies) {
  return learnGuidesForSpecies(species)
}
</script>

<template>
  <section class="ui-page-container mx-auto max-w-2xl">
    <header class="mb-6">
      <h1 class="ui-page-title">{{ $t('learn.title') }}</h1>
      <p class="ui-page-subtitle mt-1">{{ $t('learn.subtitle') }}</p>
    </header>

    <p v-if="LEARN_GUIDES.length === 0" class="ui-empty">
      {{ $t('learn.empty') }}
    </p>

    <div v-else class="flex flex-col gap-8">
      <section v-for="species in speciesOnPage" :key="species">
        <h2 class="ui-section-title">{{ $t(`learn.species.${species}`) }}</h2>
        <ul class="mt-3 flex list-none flex-col gap-2">
          <li v-for="guide in guidesIn(species)" :key="guide.slug">
            <NuxtLink
              :to="localePath(`/learn/${guide.slug}`)"
              class="ui-list-link"
            >
              <div class="min-w-0 flex-1">
                <p class="ui-list-link-title">{{ guide.title }}</p>
                <p class="ui-list-link-meta">{{ guide.summary }}</p>
              </div>
              <Icon
                :icon="UI_ACTION_ICONS.chevron"
                class="ui-icon-sm shrink-0 text-(--ui-text-muted)"
                aria-hidden="true"
              />
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>

    <p class="ui-page-subtitle mt-8">
      <i18n-t keypath="learn.consultationsHint" tag="span">
        <template #consultations>
          <NuxtLink :to="localePath('/consultations')" class="ui-link">
            {{ $t('consultations.title') }}
          </NuxtLink>
        </template>
      </i18n-t>
    </p>
  </section>
</template>
