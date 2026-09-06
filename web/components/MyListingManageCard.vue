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
import type { MarketplaceInquirySummary } from '~/types/marketplace-inquiry'
import ListingForm from '~/components/ListingForm.vue'

const props = defineProps<{
  listing: MarketplaceListing
  isEditing: boolean
  inquiries?: MarketplaceInquirySummary[]
  messagesOpen?: boolean
}>()

const emit = defineEmits<{
  updated: [listing: MarketplaceListing]
  deleted: [id: number]
  beginEdit: [id: number]
  cancelEdit: []
  toggleMessages: [id: number]
}>()

const auth = useAuthStore()
const { t } = useI18n()
const localePath = useLocalePath()
const { formatIso } = useDateTime()
const isSaving = ref(false)
const isDeleting = ref(false)
const errorMessage = ref('')
const createdLabel = computed(() => formatIso(props.listing.createdAt))

const listingInquiries = computed(() => props.inquiries ?? [])
const unreadCount = computed(() =>
  listingInquiries.value.reduce((sum, item) => sum + Math.max(0, item.unreadCount), 0),
)

function otherPartyName(item: MarketplaceInquirySummary) {
  return item.customer.displayName
}

function lastPreview(item: MarketplaceInquirySummary) {
  if (!item.lastMessage) {
    return t('marketplace.inquiry.noMessagesYet')
  }
  const prefix =
    item.lastMessage.senderUserId === auth.user?.id
      ? t('marketplace.inquiry.lastMessageYou')
      : otherPartyName(item)
  return `${prefix}: ${item.lastMessage.body}`
}

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
        <button
          type="button"
          class="ui-btn-sm"
          :class="messagesOpen ? 'ui-btn-primary' : 'ui-btn-secondary'"
          @click="emit('toggleMessages', listing.id)"
        >
          <Icon :icon="UI_ACTION_ICONS.message" class="ui-icon-sm" aria-hidden="true" />
          {{ $t('marketplace.cardMessages') }}
          <span
            v-if="unreadCount > 0"
            class="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 py-0.5 text-xs font-semibold text-white"
          >
            {{ unreadCount }}
          </span>
          <span
            v-else-if="listingInquiries.length > 0"
            class="ml-1 text-xs text-(--ui-text-muted)"
          >
            ({{ listingInquiries.length }})
          </span>
        </button>
        <button
          type="button"
          class="ui-btn-ghost ui-btn-sm text-red-600 dark:text-red-400"
          :disabled="isDeleting"
          @click="onDelete"
        >
          <Icon :icon="UI_ACTION_ICONS.remove" class="ui-icon-sm" aria-hidden="true" />
          {{ $t('common.remove') }}
        </button>
      </div>

      <div v-if="messagesOpen" class="mt-4 border-t border-(--ui-border) pt-3">
        <p class="ui-caption">{{ $t('marketplace.cardMessagesHint') }}</p>
        <p v-if="listingInquiries.length === 0" class="ui-empty mt-3">
          {{ $t('marketplace.cardMessagesEmpty') }}
        </p>
        <ul v-else class="mt-3 flex list-none flex-col gap-2">
          <li v-for="item in listingInquiries" :key="item.id">
            <NuxtLink
              :to="localePath(`/app/marketplace-inquiries/${item.id}`)"
              class="block rounded-lg border border-(--ui-border) p-3 transition hover:bg-(--ui-surface-muted)/30"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-stone-900 dark:text-stone-100">
                    {{ $t('marketplace.inquiry.withPerson', { name: otherPartyName(item) }) }}
                  </p>
                  <p class="mt-1 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">
                    {{ lastPreview(item) }}
                  </p>
                </div>
                <span
                  v-if="item.unreadCount > 0"
                  class="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 px-1.5 py-0.5 text-xs font-semibold text-white"
                >
                  {{ item.unreadCount }}
                </span>
              </div>
            </NuxtLink>
          </li>
        </ul>
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
