<script setup lang="ts">
import ListingForm from '~/components/ListingForm.vue'
import MarketplaceInquiryInbox from '~/components/MarketplaceInquiryInbox.vue'
import MyListingManageCard from '~/components/MyListingManageCard.vue'
import { ApiError } from '~/lib/auth-api'
import { createMarketplaceListing, fetchMyMarketplaceListings } from '~/lib/marketplace-api'
import { fetchMarketplaceInquiries } from '~/lib/marketplace-inquiries-api'
import type { ListingFormSubmit } from '~/types/marketplace'
import type { MarketplaceInquirySummary } from '~/types/marketplace-inquiry'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { useAuthStore } from '~/stores/auth'
import type { MarketplaceListing } from '~/types/marketplace'

definePageMeta({
  layout: 'app',
  middleware: ['auth', 'block-admin'],
  ssr: false,
})

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()

const listings = ref<MarketplaceListing[]>([])
const sellerInquiries = ref<MarketplaceInquirySummary[]>([])
const isLoading = ref(true)
const loadError = ref('')
const createError = ref('')
const isCreating = ref(false)
const isCreateOpen = ref(false)
const editingListingId = ref<number | null>(null)
const openMessagesListingId = ref<number | null>(null)
const showBuyingChats = ref(false)

const inquiriesByListingId = computed(() => {
  const map = new Map<number, MarketplaceInquirySummary[]>()
  for (const item of sellerInquiries.value) {
    const list = map.get(item.listingId) ?? []
    list.push(item)
    map.set(item.listingId, list)
  }
  return map
})

function inquiriesForListing(listingId: number) {
  return inquiriesByListingId.value.get(listingId) ?? []
}

async function loadPage() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const [{ listings: list }, seller] = await Promise.all([
      fetchMyMarketplaceListings(token, { limit: 50 }),
      fetchMarketplaceInquiries(token, 'seller', { limit: 50 }),
    ])
    listings.value = list
    sellerInquiries.value = seller.inquiries
  } catch (err) {
    loadError.value = err instanceof ApiError ? err.message : t('marketplace.loadError')
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await loadPage()
  const listingParam = Number(route.query.listing)
  if (Number.isInteger(listingParam) && listingParam > 0) {
    openMessagesListingId.value = listingParam
  } else if (route.query.tab === 'messages') {
    const withUnread = sellerInquiries.value.find((item) => item.unreadCount > 0)
    if (withUnread) {
      openMessagesListingId.value = withUnread.listingId
    }
    showBuyingChats.value = true
  }
})

async function onCreate(submit: ListingFormSubmit) {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isCreating.value = true
  createError.value = ''
  try {
    const { listing } = await createMarketplaceListing(
      token,
      submit.payload,
      submit.newFiles,
    )
    listings.value = [listing, ...listings.value]
    isCreateOpen.value = false
    editingListingId.value = null
  } catch (err) {
    createError.value = err instanceof ApiError ? err.message : t('marketplace.createError')
  } finally {
    isCreating.value = false
  }
}

function onUpdated(updated: MarketplaceListing) {
  listings.value = listings.value.map((item) => (item.id === updated.id ? updated : item))
  editingListingId.value = null
}

function onDeleted(id: number) {
  listings.value = listings.value.filter((item) => item.id !== id)
  sellerInquiries.value = sellerInquiries.value.filter((item) => item.listingId !== id)
  if (editingListingId.value === id) {
    editingListingId.value = null
  }
  if (openMessagesListingId.value === id) {
    openMessagesListingId.value = null
  }
}

function onOpenCreate() {
  editingListingId.value = null
  openMessagesListingId.value = null
  isCreateOpen.value = true
}

function onBeginEdit(id: number) {
  isCreateOpen.value = false
  openMessagesListingId.value = null
  editingListingId.value = id
}

function onCancelEdit() {
  editingListingId.value = null
}

function onToggleMessages(id: number) {
  isCreateOpen.value = false
  editingListingId.value = null
  openMessagesListingId.value = openMessagesListingId.value === id ? null : id
}
</script>

<template>
  <section class="ui-page-container">
    <NuxtLink :to="localePath('/app/profile')" class="ui-link-back mb-0! inline-flex">
      <Icon :icon="UI_ACTION_ICONS.back" class="ui-icon-sm" aria-hidden="true" />
      {{ $t('marketplace.backToProfile') }}
    </NuxtLink>

    <div class="mt-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="ui-page-title">{{ $t('marketplace.hubTitle') }}</h1>
        <p class="ui-page-subtitle mt-2">{{ $t('marketplace.hubSubtitle') }}</p>
      </div>
      <button
        v-if="!isCreateOpen && editingListingId === null"
        type="button"
        class="ui-btn-primary ui-btn-sm"
        @click="onOpenCreate"
      >
        {{ $t('marketplace.create') }}
      </button>
    </div>

    <div v-if="isCreateOpen" class="ui-card mt-6 p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="ui-section-title">{{ $t('marketplace.create') }}</h2>
        <button type="button" class="ui-btn-ghost ui-btn-sm" @click="isCreateOpen = false">
          {{ $t('common.cancel') }}
        </button>
      </div>
      <ListingForm
        :is-submitting="isCreating"
        @save="onCreate"
        @publish="onCreate"
        @cancel="isCreateOpen = false"
      />
      <p v-if="createError" class="ui-alert-error mt-3" role="alert">{{ createError }}</p>
    </div>

    <p v-if="isLoading" class="ui-loading mt-6">{{ $t('common.loading') }}</p>
    <p v-else-if="loadError" class="ui-alert-error mt-6" role="alert">{{ loadError }}</p>
    <p v-else-if="listings.length === 0" class="ui-empty mt-8">
      {{ $t('marketplace.myListingsEmpty') }}
    </p>
    <ul v-else class="mt-6 flex list-none flex-col gap-4">
      <li v-for="listing in listings" :key="listing.id">
        <MyListingManageCard
          :listing="listing"
          :is-editing="editingListingId === listing.id"
          :inquiries="inquiriesForListing(listing.id)"
          :messages-open="openMessagesListingId === listing.id"
          @updated="onUpdated"
          @deleted="onDeleted"
          @begin-edit="onBeginEdit"
          @cancel-edit="onCancelEdit"
          @toggle-messages="onToggleMessages"
        />
      </li>
    </ul>

    <section class="mt-10 border-t border-(--ui-border) pt-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="ui-section-title">{{ $t('marketplace.buyingChatsTitle') }}</h2>
          <p class="ui-caption mt-1">{{ $t('marketplace.buyingChatsHint') }}</p>
        </div>
        <button
          type="button"
          class="ui-btn-sm"
          :class="showBuyingChats ? 'ui-btn-primary' : 'ui-btn-secondary'"
          @click="showBuyingChats = !showBuyingChats"
        >
          {{
            showBuyingChats
              ? $t('marketplace.buyingChatsHide')
              : $t('marketplace.buyingChatsShow')
          }}
        </button>
      </div>
      <div v-if="showBuyingChats" class="mt-4">
        <MarketplaceInquiryInbox :active="showBuyingChats" role="customer" />
      </div>
    </section>
  </section>
</template>
