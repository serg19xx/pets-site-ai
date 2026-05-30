<script setup lang="ts">
import MarketplaceCard from '~/components/MarketplaceCard.vue'
import { ApiError } from '~/lib/auth-api'
import { fetchMarketplaceListings } from '~/lib/marketplace-api'
import type { MarketplaceListing } from '~/types/marketplace'

const { t } = useI18n()
const localePath = useLocalePath()

definePageMeta({
  ssr: false,
})

usePageSeo({
  title: computed(() => t('meta.marketplace.title')),
  description: computed(() => t('meta.marketplace.description')),
  path: computed(() => localePath('/marketplace')),
})

const listings = ref<MarketplaceListing[]>([])
const isLoading = ref(true)
const loadError = ref('')
const searchQuery = ref('')
const typeFilter = ref<'all' | MarketplaceListing['type']>('all')
const cityFilter = ref('')
const sortOrder = ref<'newest' | 'oldest'>('newest')

const filteredListings = computed(() => {
  const filtered = listings.value.filter((item) => {
    if (typeFilter.value !== 'all' && item.type !== typeFilter.value) {
      return false
    }
    const q = searchQuery.value.trim().toLowerCase()
    if (q) {
      const haystack = `${item.title} ${item.description}`.toLowerCase()
      if (!haystack.includes(q)) {
        return false
      }
    }
    const city = cityFilter.value.trim().toLowerCase()
    if (city) {
      return (item.city ?? '').toLowerCase().includes(city)
    }
    return true
  })

  const byDate = (a: MarketplaceListing, b: MarketplaceListing) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

  return [...filtered].sort((a, b) =>
    sortOrder.value === 'oldest' ? byDate(a, b) : byDate(b, a),
  )
})

async function loadListings() {
  isLoading.value = true
  loadError.value = ''
  try {
    const { listings: list } = await fetchMarketplaceListings({ limit: 40 })
    listings.value = list
  } catch (err) {
    loadError.value = err instanceof ApiError ? err.message : t('marketplace.loadError')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadListings()
})
</script>

<template>
  <section class="ui-page-container">
    <header class="mb-4">
      <h1 class="ui-page-title">{{ $t('marketplace.title') }}</h1>
      <p class="ui-page-subtitle mt-1">{{ $t('marketplace.subtitle') }}</p>
    </header>

    <div class="ui-card mb-6 p-4">
      <h2 class="ui-section-title">{{ $t('marketplace.filtersTitle') }}</h2>
      <div class="mt-3 grid gap-3 md:grid-cols-4">
        <label class="ui-field">
          {{ $t('marketplace.search') }}
          <input
            v-model="searchQuery"
            type="text"
            class="ui-input"
            :placeholder="$t('marketplace.searchPlaceholder')"
          />
        </label>
        <label class="ui-field">
          {{ $t('marketplace.type') }}
          <select v-model="typeFilter" class="ui-select">
            <option value="all">{{ $t('marketplace.allTypes') }}</option>
            <option value="sell">{{ $t('marketplace.types.sell') }}</option>
            <option value="buy">{{ $t('marketplace.types.buy') }}</option>
            <option value="exchange">{{ $t('marketplace.types.exchange') }}</option>
            <option value="service">{{ $t('marketplace.types.service') }}</option>
          </select>
        </label>
        <label class="ui-field">
          {{ $t('marketplace.city') }}
          <input
            v-model="cityFilter"
            type="text"
            class="ui-input"
            :placeholder="$t('marketplace.cityPlaceholder')"
          />
        </label>
        <label class="ui-field">
          {{ $t('marketplace.sortBy') }}
          <select v-model="sortOrder" class="ui-select">
            <option value="newest">{{ $t('marketplace.sortNewest') }}</option>
            <option value="oldest">{{ $t('marketplace.sortOldest') }}</option>
          </select>
        </label>
      </div>
      <div class="mt-4 rounded-lg border border-dashed border-(--ui-border) p-3">
        <p class="text-sm font-medium text-stone-800 dark:text-stone-200">
          {{ $t('marketplace.futureFiltersTitle') }}
        </p>
        <div class="mt-2 flex flex-wrap gap-2">
          <span class="ui-btn-secondary ui-btn-sm opacity-70">
            {{ $t('marketplace.futureFilterCategory') }}
          </span>
          <span class="ui-btn-secondary ui-btn-sm opacity-70">
            {{ $t('marketplace.futureFilterPrice') }}
          </span>
          <span class="ui-btn-secondary ui-btn-sm opacity-70">
            {{ $t('marketplace.futureFilterBenefit') }}
          </span>
        </div>
        <p class="ui-caption mt-2">{{ $t('marketplace.futureFiltersHint') }}</p>
      </div>
    </div>

    <p v-if="isLoading" class="ui-loading">{{ $t('common.loading') }}</p>
    <p v-else-if="loadError" class="ui-alert-error" role="alert">{{ loadError }}</p>
    <p v-else-if="filteredListings.length === 0" class="ui-empty">{{ $t('marketplace.emptyFiltered') }}</p>
    <ul v-else class="flex list-none flex-col gap-4">
      <li v-for="listing in filteredListings" :key="listing.id">
        <MarketplaceCard :listing="listing" :show-author="true" />
      </li>
    </ul>
  </section>
</template>
