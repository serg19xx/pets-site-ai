<script setup lang="ts">
import ListingForm from '~/components/ListingForm.vue'
import MyListingManageCard from '~/components/MyListingManageCard.vue'
import { ApiError } from '~/lib/auth-api'
import { createMarketplaceListing, fetchMyMarketplaceListings } from '~/lib/marketplace-api'
import type { ListingFormSubmit } from '~/types/marketplace'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { useAuthStore } from '~/stores/auth'
import type { MarketplaceListing } from '~/types/marketplace'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
  ssr: false,
})

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()

const listings = ref<MarketplaceListing[]>([])
const isLoading = ref(true)
const loadError = ref('')
const createError = ref('')
const isCreating = ref(false)
const isCreateOpen = ref(false)
const editingListingId = ref<number | null>(null)

async function loadListings() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const { listings: list } = await fetchMyMarketplaceListings(token, { limit: 50 })
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
  if (editingListingId.value === id) {
    editingListingId.value = null
  }
}

function onOpenCreate() {
  editingListingId.value = null
  isCreateOpen.value = true
}

function onBeginEdit(id: number) {
  isCreateOpen.value = false
  editingListingId.value = id
}

function onCancelEdit() {
  editingListingId.value = null
}
</script>

<template>
  <section class="ui-page-container">
    <NuxtLink :to="localePath('/app/profile')" class="ui-link-back mb-0! inline-flex">
      <Icon :icon="UI_ACTION_ICONS.back" class="ui-icon-sm" aria-hidden="true" />
      {{ $t('marketplace.backToProfile') }}
    </NuxtLink>

    <h1 class="ui-page-title mt-4">{{ $t('marketplace.myListingsTitle') }}</h1>
    <p class="ui-page-subtitle mt-2">{{ $t('marketplace.myListingsSubtitle') }}</p>

    <div class="mt-6 flex justify-end">
      <button
        v-if="!isCreateOpen && editingListingId === null"
        type="button"
        class="ui-btn-primary ui-btn-sm"
        @click="onOpenCreate"
      >
        {{ $t('marketplace.create') }}
      </button>
    </div>

    <div v-if="isCreateOpen" class="ui-card mt-3 p-4">
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
    <p v-else-if="listings.length === 0" class="ui-empty mt-8">{{ $t('marketplace.myListingsEmpty') }}</p>
    <ul v-else class="mt-6 flex list-none flex-col gap-4">
      <li v-for="listing in listings" :key="listing.id">
        <MyListingManageCard
          :listing="listing"
          :is-editing="editingListingId === listing.id"
          @updated="onUpdated"
          @deleted="onDeleted"
          @begin-edit="onBeginEdit"
          @cancel-edit="onCancelEdit"
        />
      </li>
    </ul>
  </section>
</template>
