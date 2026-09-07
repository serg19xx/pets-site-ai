<script setup lang="ts">
import { LOCAL_PARTNERS } from '~/data/local-partners'

const { t } = useI18n()
const localePath = useLocalePath()

usePageSeo({
  title: () => t('partners.pageTitle'),
  description: () => t('partners.pageDescription'),
})
</script>

<template>
  <section class="ui-page-container">
    <NuxtLink :to="localePath('/feed')" class="ui-link-back">
      {{ $t('pet.backToGallery') }}
    </NuxtLink>

    <header class="mt-4 mb-6">
      <h1 class="ui-page-title">{{ $t('partners.pageTitle') }}</h1>
      <p class="ui-page-subtitle mt-1">{{ $t('partners.pageLead') }}</p>
    </header>

    <p v-if="LOCAL_PARTNERS.length === 0" class="ui-empty">
      {{ $t('partners.pageEmpty') }}
    </p>

    <ul v-else class="ui-partners-page-list" role="list">
      <li v-for="partner in LOCAL_PARTNERS" :key="partner.id">
        <a
          :href="partner.url"
          class="ui-partners-page-card"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            :src="partner.logoSrc"
            :alt="partner.name"
            class="ui-partners-page-logo"
            loading="lazy"
            decoding="async"
          />
          <span class="ui-partners-page-name">{{ partner.name }}</span>
          <span v-if="partner.region" class="ui-hint">{{ partner.region }}</span>
        </a>
      </li>
    </ul>
  </section>
</template>
