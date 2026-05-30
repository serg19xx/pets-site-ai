<script setup lang="ts">
import { ApiError } from '~/lib/auth-api'
import {
  deleteMarketplaceListing,
  syncMarketplaceListingMedia,
  updateMarketplaceListing,
} from '~/lib/marketplace-api'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { useAuthStore } from '~/stores/auth'
import type { ListingFormSubmit, MarketplaceListing } from '~/types/marketplace'
import ListingForm from '~/components/ListingForm.vue'

const props = defineProps<{
  listing: MarketplaceListing
  isEditing: boolean
}>()

const emit = defineEmits<{
  updated: [listing: MarketplaceListing]
  deleted: [id: number]
  beginEdit: [id: number]
  cancelEdit: []
}>()

const auth = useAuthStore()
const { t, locale } = useI18n()
const isSaving = ref(false)
const isDeleting = ref(false)
const errorMessage = ref('')
const createdLabel = computed(() =>
  new Date(props.listing.createdAt).toLocaleString(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }),
)

async function persistListing(submit: ListingFormSubmit) {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isSaving.value = true
  errorMessage.value = ''
  try {
    const { listing: updated } = await updateMarketplaceListing(
      props.listing.id,
      token,
      submit.payload,
    )
    const hasMediaChanges =
      submit.newFiles.length > 0 || submit.removedMediaIds.length > 0
    const listing = hasMediaChanges
      ? await syncMarketplaceListingMedia(
          props.listing.id,
          token,
          submit.newFiles,
          submit.removedMediaIds,
        )
      : updated
    emit('updated', listing)
    emit('cancelEdit')
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : t('marketplace.saveError')
  } finally {
    isSaving.value = false
  }
}

async function onSave(submit: ListingFormSubmit) {
  await persistListing(submit)
}

async function onPublish(submit: ListingFormSubmit) {
  await persistListing(submit)
}

async function onDelete() {
  if (!window.confirm(t('marketplace.deleteConfirm'))) {
    return
  }
  const token = auth.accessToken
  if (!token) {
    return
  }
  isDeleting.value = true
  errorMessage.value = ''
  try {
    await deleteMarketplaceListing(props.listing.id, token)
    emit('deleted', props.listing.id)
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : t('marketplace.deleteError')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <article class="ui-card p-4">
    <template v-if="!isEditing">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="ui-caption uppercase">{{ $t(`marketplace.types.${listing.type}`) }}</p>
          <h3 class="mt-1 text-base font-semibold text-stone-900 dark:text-stone-100">
            {{ listing.title }}
          </h3>
        </div>
        <p class="ui-caption">{{ $t(`marketplace.statuses.${listing.status}`) }}</p>
      </div>

      <ul
        v-if="listing.media.length > 0"
        class="ui-feed-preview-grid mt-3 list-none"
        :aria-label="$t('marketplace.photosLabel')"
      >
        <li
          v-for="item in listing.media"
          :key="item.id"
          class="ui-feed-preview-tile max-h-24"
        >
          <img :src="item.url" alt="" class="h-full w-full object-cover" loading="lazy" />
        </li>
      </ul>

      <p class="mt-2 line-clamp-3 text-sm whitespace-pre-wrap text-stone-700 dark:text-stone-300">
        {{ listing.description }}
      </p>
      <p class="ui-caption mt-2">
        {{ createdLabel }}
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="button" class="ui-btn-secondary ui-btn-sm" @click="emit('beginEdit', listing.id)">
          <Icon :icon="UI_ACTION_ICONS.edit" class="ui-icon-sm" aria-hidden="true" />
          {{ $t('common.edit') }}
        </button>
        <button type="button" class="ui-btn-ghost ui-btn-sm text-red-600 dark:text-red-400" :disabled="isDeleting" @click="onDelete">
          <Icon :icon="UI_ACTION_ICONS.remove" class="ui-icon-sm" aria-hidden="true" />
          {{ $t('common.remove') }}
        </button>
      </div>
    </template>
    <template v-else>
      <ListingForm
        :model-value="listing"
        :is-submitting="isSaving"
        @save="onSave"
        @publish="onPublish"
        @cancel="emit('cancelEdit')"
      />
    </template>

    <p v-if="errorMessage" class="ui-alert-error mt-3 text-sm" role="alert">
      {{ errorMessage }}
    </p>
  </article>
</template>
