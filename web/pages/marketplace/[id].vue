<script setup lang="ts">
import { ApiError } from '~/lib/auth-api'
import { fetchMarketplaceListing } from '~/lib/marketplace-api'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { useAuthStore } from '~/stores/auth'
import type { MarketplaceListing } from '~/types/marketplace'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()
const { formatIso } = useDateTime()
const listingId = computed(() => Number(route.params.id))

definePageMeta({
  ssr: false,
})

const listing = ref<MarketplaceListing | null>(null)
const isLoading = ref(true)
const loadError = ref('')

const createdLabel = computed(() => {
  if (!listing.value) {
    return ''
  }
  return formatIso(listing.value.createdAt)
})

const mediaGridClass = computed(() =>
  listing.value && listing.value.media.length > 1 ? 'ui-feed-post-media-grid--multi' : '',
)

const priceLabel = computed(() => {
  if (!listing.value) {
    return ''
  }
  if (listing.value.priceAmount === null) {
    return t('marketplace.priceOnRequest')
  }
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: listing.value.priceCurrency || 'CAD',
    maximumFractionDigits: 2,
  }).format(listing.value.priceAmount)
})

async function loadListing() {
  const id = listingId.value
  if (!Number.isInteger(id) || id < 1) {
    loadError.value = t('marketplace.invalidId')
    isLoading.value = false
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const { listing: loaded } = await fetchMarketplaceListing(id, auth.accessToken ?? undefined)
    listing.value = loaded
  } catch (err) {
    if (err instanceof ApiError) {
      loadError.value = err.status === 404 ? t('marketplace.notFound') : err.message
    } else {
      loadError.value = t('marketplace.loadError')
    }
  } finally {
    isLoading.value = false
  }
}

watch(listingId, () => {
  void loadListing()
}, { immediate: true })

usePageSeo({
  title: computed(() =>
    listing.value
      ? t('meta.marketplace.titleNamed', { title: listing.value.title })
      : t('meta.marketplace.title'),
  ),
  description: computed(() =>
    listing.value?.description?.slice(0, 160) || t('meta.marketplace.description'),
  ),
  path: computed(() => localePath(`/marketplace/${listingId.value}`)),
})
</script>

<template>
  <section class="ui-page-container">
    <NuxtLink :to="localePath('/marketplace')" class="ui-link-back mb-0! inline-flex">
      <Icon :icon="UI_ACTION_ICONS.back" class="ui-icon-sm" aria-hidden="true" />
      {{ $t('marketplace.backToList') }}
    </NuxtLink>

    <p v-if="isLoading" class="ui-loading mt-6">{{ $t('common.loading') }}</p>
    <p v-else-if="loadError" class="ui-alert-error mt-6" role="alert">{{ loadError }}</p>

    <article v-else-if="listing" class="ui-card mt-4 p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="ui-caption uppercase">{{ $t(`marketplace.types.${listing.type}`) }}</p>
          <h1 class="ui-page-title mt-1">{{ listing.title }}</h1>
        </div>
        <p class="text-base font-semibold text-primary-700 dark:text-primary-300">{{ priceLabel }}</p>
      </div>

      <div v-if="listing.media.length > 0" class="ui-feed-post-media mt-4">
        <div
          class="ui-feed-post-media-grid"
          :class="mediaGridClass"
        >
          <div
            v-for="item in listing.media"
            :key="item.id"
            class="ui-feed-post-media-item"
          >
            <img :src="item.url" alt="" loading="lazy" />
          </div>
        </div>
      </div>

      <p class="mt-3 whitespace-pre-wrap text-sm text-stone-700 dark:text-stone-300">
        {{ listing.description }}
      </p>

      <dl class="mt-4 grid gap-2 text-sm">
        <div v-if="listing.city" class="grid grid-cols-[8rem_1fr] gap-2">
          <dt class="text-(--ui-text-muted)">{{ $t('marketplace.city') }}</dt>
          <dd class="font-medium">{{ listing.city }}</dd>
        </div>
        <div class="grid grid-cols-[8rem_1fr] gap-2">
          <dt class="text-(--ui-text-muted)">{{ $t('marketplace.author') }}</dt>
          <dd class="font-medium">{{ listing.author.displayName }}</dd>
        </div>
        <div class="grid grid-cols-[8rem_1fr] gap-2">
          <dt class="text-(--ui-text-muted)">{{ $t('marketplace.postedAt') }}</dt>
          <dd class="font-medium">{{ createdLabel }}</dd>
        </div>
        <div v-if="listing.contactPhone" class="grid grid-cols-[8rem_1fr] gap-2">
          <dt class="text-(--ui-text-muted)">{{ $t('marketplace.contactPhone') }}</dt>
          <dd class="font-medium">
            <a class="ui-link" :href="`tel:${listing.contactPhone}`">{{ listing.contactPhone }}</a>
          </dd>
        </div>
        <div v-if="listing.contactMethod" class="grid grid-cols-[8rem_1fr] gap-2">
          <dt class="text-(--ui-text-muted)">{{ $t('marketplace.contactMethod') }}</dt>
          <dd class="font-medium">{{ listing.contactMethod }}</dd>
        </div>
      </dl>
    </article>

    <ListingInquiryContact
      v-if="listing"
      :listing-id="listing.id"
      :seller-user-id="listing.author.id"
    />
  </section>
</template>
