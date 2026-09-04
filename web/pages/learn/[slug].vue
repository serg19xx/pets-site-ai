<script setup lang="ts">
import { getLearnGuideBySlug } from '~/data/learn-guides'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const slug = computed(() => String(route.params.slug ?? ''))
const guide = computed(() => getLearnGuideBySlug(slug.value))

if (import.meta.server && !guide.value) {
  throw createError({ statusCode: 404, statusMessage: 'Guide not found' })
}

usePageSeo({
  title: computed(() =>
    guide.value
      ? t('meta.learn.guideTitle', { title: guide.value.title })
      : t('meta.learn.title'),
  ),
  description: computed(() => guide.value?.summary ?? t('meta.learn.description')),
  path: computed(() => localePath(`/learn/${slug.value}`)),
})
</script>

<template>
  <section class="ui-page-container mx-auto max-w-2xl">
    <NuxtLink :to="localePath('/learn')" class="ui-link-back mb-0! inline-flex">
      <Icon :icon="UI_ACTION_ICONS.back" class="ui-icon-sm" aria-hidden="true" />
      {{ $t('learn.backToLearn') }}
    </NuxtLink>

    <p v-if="!guide" class="ui-alert-error mt-6" role="alert">
      {{ $t('learn.notFound') }}
    </p>

    <article v-else class="mt-6">
      <header class="mb-4">
        <p class="ui-overline">
          {{ $t(`learn.species.${guide.species}`) }}
          ·
          {{ $t(`learn.topics.${guide.topic}`) }}
        </p>
        <h1 class="ui-page-title mt-1">{{ guide.title }}</h1>
        <p class="ui-caption mt-2">
          {{ $t('learn.byline', { name: guide.authorName }) }}
          ·
          {{ $t('learn.originalLang', { lang: $t(`learn.langs.${guide.originalLang}`) }) }}
        </p>
      </header>

      <p class="ui-learn-disclaimer" role="note">
        {{ $t('learn.disclaimer') }}
      </p>
      <p class="ui-page-subtitle mt-2">
        {{ $t('learn.translateHint') }}
      </p>

      <div class="ui-learn-body mt-6" :lang="guide.originalLang">
        <template v-for="(block, index) in guide.body" :key="index">
          <p v-if="block.type === 'p'" class="ui-body">
            {{ block.text }}
          </p>
          <ul v-else-if="block.type === 'ul'" class="ui-learn-list">
            <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
              {{ item }}
            </li>
          </ul>
        </template>
      </div>
    </article>
  </section>
</template>
