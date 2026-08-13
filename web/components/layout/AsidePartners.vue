<script setup lang="ts">
import {
  LOCAL_PARTNERS,
  LOCAL_PARTNERS_SIDEBAR_LIMIT,
} from '~/data/local-partners'

const localePath = useLocalePath()

const sidebarPartners = computed(() =>
  LOCAL_PARTNERS.slice(0, LOCAL_PARTNERS_SIDEBAR_LIMIT),
)

const hasMore = computed(
  () => LOCAL_PARTNERS.length > LOCAL_PARTNERS_SIDEBAR_LIMIT,
)

const isEmpty = computed(() => LOCAL_PARTNERS.length === 0)
</script>

<template>
  <div class="ui-panel mt-4">
    <h2 class="ui-panel-title">{{ $t('partners.asideTitle') }}</h2>
    <p class="ui-page-subtitle mt-1">{{ $t('partners.asideHint') }}</p>

    <p v-if="isEmpty" class="ui-hint mt-3">
      {{ $t('partners.asideEmpty') }}
    </p>

    <ul v-else class="ui-partners-aside-list mt-3" role="list">
      <li v-for="partner in sidebarPartners" :key="partner.id">
        <a
          :href="partner.url"
          class="ui-partners-aside-link"
          target="_blank"
          rel="noopener noreferrer"
          :title="partner.name"
          :aria-label="partner.name"
        >
          <img
            :src="partner.logoSrc"
            :alt="partner.name"
            class="ui-partners-aside-logo"
            loading="lazy"
            decoding="async"
          />
        </a>
      </li>
    </ul>

    <NuxtLink
      v-if="hasMore"
      :to="localePath('/partners')"
      class="ui-link mt-3 inline-block text-sm"
    >
      {{ $t('partners.seeMore') }}
    </NuxtLink>
  </div>
</template>
