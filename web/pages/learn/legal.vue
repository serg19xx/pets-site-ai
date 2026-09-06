<script setup lang="ts">
import {
  LEARN_LEGAL_LINKS,
  LEARN_LEGAL_PROVINCE_ORDER,
  learnLegalLinkNote,
  learnLegalLinkTitle,
  type LearnLegalLink,
  type LearnLegalRegion,
} from '~/data/learn-legal-links'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'

const { t, locale } = useI18n()
const localePath = useLocalePath()

usePageSeo({
  title: computed(() => t('meta.learn.legalTitle')),
  description: computed(() => t('learn.legal.metaDescription')),
  path: computed(() => localePath('/learn/legal')),
})

const searchQuery = ref('')
const localeTag = computed(() => String(locale.value))

function regionLabel(region: LearnLegalRegion) {
  return t(`learn.legal.regions.${region}`)
}

function linkTitle(link: LearnLegalLink) {
  return learnLegalLinkTitle(link, localeTag.value)
}

function linkNote(link: LearnLegalLink) {
  return learnLegalLinkNote(link, localeTag.value)
}

function linkMatchesQuery(link: LearnLegalLink, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) {
    return true
  }
  const haystack = [
    link.titleEn,
    link.titleFr,
    link.noteEn,
    link.noteFr,
    link.url,
    link.region,
    regionLabel(link.region),
    ...link.topics,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

const filteredLinks = computed(() =>
  LEARN_LEGAL_LINKS.filter((link) => linkMatchesQuery(link, searchQuery.value)),
)

const federalLinks = computed(() =>
  filteredLinks.value.filter((link) => link.region === 'federal'),
)

const provinceSections = computed(() =>
  LEARN_LEGAL_PROVINCE_ORDER.map((region) => ({
    region,
    links: filteredLinks.value.filter((link) => link.region === region),
  })).filter((section) => section.links.length > 0),
)

const hasNoMatches = computed(
  () => searchQuery.value.trim().length > 0 && filteredLinks.value.length === 0,
)
</script>

<template>
  <section class="ui-page-container mx-auto max-w-2xl">
    <NuxtLink :to="localePath('/learn')" class="ui-link-back mb-0! inline-flex">
      <Icon :icon="UI_ACTION_ICONS.back" class="ui-icon-sm" aria-hidden="true" />
      {{ $t('learn.backToLearn') }}
    </NuxtLink>

    <header class="mt-6 mb-4">
      <h1 class="ui-page-title">{{ $t('learn.legal.title') }}</h1>
      <p class="ui-page-subtitle mt-2">{{ $t('learn.legal.subtitle') }}</p>
    </header>

    <p class="ui-learn-disclaimer" role="note">
      {{ $t('learn.legal.disclaimer') }}
    </p>
    <p class="ui-caption mt-2">
      {{ $t('learn.legal.municipalNote') }}
    </p>

    <label class="ui-field mt-6">
      <span class="sr-only">{{ $t('learn.legal.searchLabel') }}</span>
      <input
        v-model="searchQuery"
        type="search"
        class="ui-input"
        :placeholder="$t('learn.legal.searchPlaceholder')"
        autocomplete="off"
        enterkeyhint="search"
      >
    </label>
    <p class="ui-caption mt-2">
      {{ $t('learn.legal.searchHint') }}
    </p>

    <p v-if="hasNoMatches" class="ui-empty mt-8">
      {{ $t('learn.legal.searchEmpty') }}
    </p>

    <template v-else>
      <section v-if="federalLinks.length > 0" class="mt-8">
        <h2 class="ui-section-title">{{ regionLabel('federal') }}</h2>
        <ul class="mt-3 flex list-none flex-col gap-2">
          <li v-for="link in federalLinks" :key="link.id">
            <a
              :href="link.url"
              class="ui-list-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div class="min-w-0 flex-1">
                <span class="ui-list-link-title block">{{ linkTitle(link) }}</span>
                <span class="ui-list-link-meta block">{{ linkNote(link) }}</span>
              </div>
              <Icon
                :icon="UI_ACTION_ICONS.chevron"
                class="ui-icon-sm shrink-0 text-(--ui-text-muted)"
                aria-hidden="true"
              />
            </a>
          </li>
        </ul>
      </section>

      <section
        v-for="section in provinceSections"
        :key="section.region"
        class="mt-8"
      >
        <h2 class="ui-section-title">{{ regionLabel(section.region) }}</h2>
        <ul class="mt-3 flex list-none flex-col gap-2">
          <li v-for="link in section.links" :key="link.id">
            <a
              :href="link.url"
              class="ui-list-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div class="min-w-0 flex-1">
                <span class="ui-list-link-title block">{{ linkTitle(link) }}</span>
                <span class="ui-list-link-meta block">{{ linkNote(link) }}</span>
              </div>
              <Icon
                :icon="UI_ACTION_ICONS.chevron"
                class="ui-icon-sm shrink-0 text-(--ui-text-muted)"
                aria-hidden="true"
              />
            </a>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>
