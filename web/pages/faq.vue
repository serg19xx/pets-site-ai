<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

usePageSeo({
  title: computed(() => t('meta.faq.title')),
  description: computed(() => t('meta.faq.description')),
  path: computed(() => localePath('/faq')),
})

interface FaqItem {
  q: string
  a: string
}

const items = computed<FaqItem[]>(() => {
  const result: FaqItem[] = []
  for (let index = 0; index < 20; index += 1) {
    const qKey = `faq.items.${index}.q`
    const q = t(qKey)
    if (q === qKey) {
      break
    }
    result.push({
      q,
      a: t(`faq.items.${index}.a`),
    })
  }
  return result
})
</script>

<template>
  <section class="ui-page-container mx-auto max-w-2xl">
    <header class="mb-6">
      <h1 class="ui-page-title">{{ $t('faq.title') }}</h1>
      <p class="ui-page-subtitle mt-1">{{ $t('faq.lead') }}</p>
    </header>

    <div class="ui-faq-list">
      <details v-for="(item, index) in items" :key="index" class="ui-faq-item">
        <summary class="ui-faq-question">{{ item.q }}</summary>
        <p class="ui-faq-answer">{{ item.a }}</p>
      </details>
    </div>

    <p class="ui-page-subtitle mt-8">
      <i18n-t keypath="faq.stillNeedHelp" tag="span">
        <template #contact>
          <NuxtLink :to="localePath('/contact')" class="ui-link">
            {{ $t('nav.contact') }}
          </NuxtLink>
        </template>
      </i18n-t>
    </p>
  </section>
</template>
