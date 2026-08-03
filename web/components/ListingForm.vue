<script setup lang="ts">
import type {
  ListingFormSubmit,
  MarketplaceListing,
  MarketplaceListingFormPayload,
} from '~/types/marketplace'
import { MARKETPLACE_MAX_PHOTOS } from '~/types/marketplace'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'

const props = defineProps<{
  modelValue?: MarketplaceListing | null
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  save: [submit: ListingFormSubmit]
  publish: [submit: ListingFormSubmit]
  cancel: []
}>()

const { t } = useI18n()

const type = ref<MarketplaceListing['type']>('sell')
const title = ref('')
const description = ref('')
const priceAmount = ref<string>('')
const priceCurrency = ref('CAD')
const city = ref('')
const contactPhone = ref('')
const contactMethod = ref('')
const inquiryNotifyEmail = ref(true)
const inquiryNotifySms = ref(false)
const inquirySmsPhone = ref('')

const isEditing = computed(() => !!props.modelValue)

const newFiles = ref<File[]>([])
const previewUrls = ref<string[]>([])
const removedMediaIds = ref<number[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

const existingMedia = computed(() => {
  const listing = props.modelValue
  if (!listing) {
    return []
  }
  const removed = new Set(removedMediaIds.value)
  return listing.media.filter((item) => !removed.has(item.id))
})

const totalPhotoCount = computed(() => existingMedia.value.length + newFiles.value.length)

const canAddPhotos = computed(() => totalPhotoCount.value < MARKETPLACE_MAX_PHOTOS)

function fieldText(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}

function parseOptionalPrice(value: unknown): number | null {
  const raw = fieldText(value)
  if (!raw) {
    return null
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function resetMediaState() {
  for (const url of previewUrls.value) {
    URL.revokeObjectURL(url)
  }
  newFiles.value = []
  previewUrls.value = []
  removedMediaIds.value = []
}

function resetFormFields() {
  type.value = 'sell'
  title.value = ''
  description.value = ''
  priceAmount.value = ''
  priceCurrency.value = 'CAD'
  city.value = ''
  contactPhone.value = ''
  contactMethod.value = ''
  inquiryNotifyEmail.value = true
  inquiryNotifySms.value = false
  inquirySmsPhone.value = ''
}

watch(
  () => props.modelValue,
  (value) => {
    resetMediaState()
    if (!value) {
      resetFormFields()
      return
    }
    type.value = value.type
    title.value = value.title
    description.value = value.description
    priceAmount.value = value.priceAmount === null ? '' : String(value.priceAmount)
    priceCurrency.value = value.priceCurrency
    city.value = value.city ?? ''
    contactPhone.value = value.contactPhone ?? ''
    contactMethod.value = value.contactMethod ?? ''
    inquiryNotifyEmail.value = value.inquirySettings?.inquiryNotifyEmail ?? true
    inquiryNotifySms.value = value.inquirySettings?.inquiryNotifySms ?? false
    inquirySmsPhone.value = value.inquirySettings?.inquirySmsPhone ?? ''
  },
  { immediate: true },
)

function buildPayload(status: MarketplaceListing['status']): MarketplaceListingFormPayload {
  const payload: MarketplaceListingFormPayload = {
    type: type.value,
    title: fieldText(title.value),
    description: fieldText(description.value),
    priceAmount: parseOptionalPrice(priceAmount.value),
    priceCurrency: fieldText(priceCurrency.value).toUpperCase() || 'CAD',
    city: fieldText(city.value) || null,
    contactPhone: fieldText(contactPhone.value) || null,
    contactMethod: fieldText(contactMethod.value) || null,
    status,
  }
  if (isEditing.value) {
    payload.inquiryNotifyEmail = inquiryNotifyEmail.value
    payload.inquiryNotifySms = inquiryNotifySms.value
    payload.inquirySmsPhone = fieldText(inquirySmsPhone.value) || null
  }
  return payload
}

function buildSubmit(status: MarketplaceListing['status']): ListingFormSubmit {
  return {
    payload: buildPayload(status),
    newFiles: [...newFiles.value],
    removedMediaIds: [...removedMediaIds.value],
  }
}

function onPickFiles() {
  fileInput.value?.click()
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const picked = input.files ? [...input.files] : []
  input.value = ''
  if (picked.length === 0) {
    return
  }
  const slotsLeft = MARKETPLACE_MAX_PHOTOS - totalPhotoCount.value
  const toAdd = picked.slice(0, Math.max(0, slotsLeft))
  for (const file of toAdd) {
    newFiles.value.push(file)
    previewUrls.value.push(URL.createObjectURL(file))
  }
}

function removeNewFile(index: number) {
  URL.revokeObjectURL(previewUrls.value[index] ?? '')
  newFiles.value = newFiles.value.filter((_, i) => i !== index)
  previewUrls.value = previewUrls.value.filter((_, i) => i !== index)
}

function removeExistingMedia(mediaId: number) {
  if (!removedMediaIds.value.includes(mediaId)) {
    removedMediaIds.value.push(mediaId)
  }
}

function onSave() {
  emit('save', buildSubmit('draft'))
}

function onPublish() {
  emit('publish', buildSubmit('active'))
}

onBeforeUnmount(() => {
  for (const url of previewUrls.value) {
    URL.revokeObjectURL(url)
  }
})
</script>

<template>
  <form class="ui-form-stack" @submit.prevent>
    <label class="ui-field">
      {{ $t('marketplace.type') }}
      <select v-model="type" class="ui-select">
        <option value="sell">{{ $t('marketplace.types.sell') }}</option>
        <option value="buy">{{ $t('marketplace.types.buy') }}</option>
        <option value="exchange">{{ $t('marketplace.types.exchange') }}</option>
        <option value="service">{{ $t('marketplace.types.service') }}</option>
      </select>
    </label>

    <label class="ui-field">
      {{ $t('marketplace.titleField') }}
      <input
        v-model="title"
        type="text"
        class="ui-input"
        required
        minlength="3"
        maxlength="180"
      />
    </label>

    <label class="ui-field">
      {{ $t('marketplace.descriptionField') }}
      <textarea
        v-model="description"
        class="ui-textarea"
        required
        minlength="10"
        maxlength="5000"
      />
    </label>

    <div class="grid gap-3 sm:grid-cols-2">
      <label class="ui-field">
        {{ $t('marketplace.price') }}
        <input
          v-model="priceAmount"
          type="text"
          inputmode="decimal"
          class="ui-input"
          :placeholder="$t('common.optional')"
        />
      </label>
      <label class="ui-field">
        {{ $t('marketplace.currency') }}
        <input
          v-model="priceCurrency"
          type="text"
          class="ui-input uppercase"
          minlength="3"
          maxlength="3"
        />
      </label>
      <label class="ui-field">
        {{ $t('marketplace.city') }}
        <input
          v-model="city"
          type="text"
          class="ui-input"
          :placeholder="$t('common.optional')"
          maxlength="120"
        />
      </label>
      <label class="ui-field">
        {{ $t('marketplace.contactPhone') }}
        <input
          v-model="contactPhone"
          type="text"
          class="ui-input"
          :placeholder="$t('common.optional')"
          maxlength="40"
        />
      </label>
      <label class="ui-field sm:col-span-2">
        {{ $t('marketplace.contactMethod') }}
        <input
          v-model="contactMethod"
          type="text"
          class="ui-input"
          :placeholder="$t('common.optional')"
          maxlength="120"
        />
      </label>
    </div>

    <fieldset v-if="isEditing" class="ui-field rounded-lg border border-(--ui-border) p-4">
      <legend class="px-1 text-sm font-medium text-stone-800 dark:text-stone-200">
        {{ $t('marketplace.inquiry.notifyTitle') }}
      </legend>
      <p class="mt-1 text-xs text-(--ui-text-muted)">{{ $t('marketplace.inquiry.notifyHint') }}</p>

      <label class="mt-3 flex items-center gap-2 text-sm">
        <input v-model="inquiryNotifyEmail" type="checkbox" class="ui-checkbox" />
        {{ $t('marketplace.inquiry.notifyEmail') }}
      </label>
      <label class="mt-2 flex items-center gap-2 text-sm">
        <input v-model="inquiryNotifySms" type="checkbox" class="ui-checkbox" />
        {{ $t('marketplace.inquiry.notifySms') }}
      </label>
      <p v-if="inquiryNotifySms" class="mt-2 text-xs text-(--ui-text-muted)">
        {{ $t('marketplace.inquiry.notifySmsServerHint') }}
      </p>
      <label v-if="inquiryNotifySms" class="ui-field mt-3">
        {{ $t('marketplace.inquiry.smsPhone') }}
        <input
          v-model="inquirySmsPhone"
          type="text"
          class="ui-input"
          maxlength="40"
          :placeholder="$t('marketplace.inquiry.smsPhonePlaceholder')"
        />
      </label>
    </fieldset>

    <div class="ui-field">
      <span class="block text-sm font-medium text-stone-800 dark:text-stone-200">
        {{ $t('marketplace.photosLabel') }}
      </span>
      <p class="mt-1 text-xs text-(--ui-text-muted)">{{ $t('marketplace.photosOptional') }}</p>

      <ul
        v-if="existingMedia.length > 0 || previewUrls.length > 0"
        class="ui-feed-preview-grid mt-3 list-none"
      >
        <li
          v-for="item in existingMedia"
          :key="`existing-${item.id}`"
          class="ui-feed-preview-tile"
        >
          <img :src="item.url" alt="" class="h-full w-full object-cover" loading="lazy" />
          <button
            type="button"
            class="ui-pet-photo-delete"
            :aria-label="$t('marketplace.removePhoto')"
            @click="removeExistingMedia(item.id)"
          >
            <Icon :icon="UI_ACTION_ICONS.remove" class="ui-icon-sm" aria-hidden="true" />
          </button>
        </li>
        <li
          v-for="(url, index) in previewUrls"
          :key="url"
          class="ui-feed-preview-tile"
        >
          <img :src="url" alt="" class="h-full w-full object-cover" />
          <button
            type="button"
            class="ui-pet-photo-delete"
            :aria-label="$t('marketplace.removePhoto')"
            @click="removeNewFile(index)"
          >
            <Icon :icon="UI_ACTION_ICONS.remove" class="ui-icon-sm" aria-hidden="true" />
          </button>
        </li>
      </ul>

      <p v-if="!canAddPhotos" class="mt-2 text-xs text-(--ui-text-muted)">
        {{ $t('marketplace.photosMax', { max: MARKETPLACE_MAX_PHOTOS }) }}
      </p>

      <button
        type="button"
        class="ui-btn-secondary ui-btn-sm mt-3"
        :disabled="!canAddPhotos || isSubmitting"
        @click="onPickFiles"
      >
        <Icon :icon="UI_ACTION_ICONS.image" class="ui-icon-sm" aria-hidden="true" />
        {{ $t('marketplace.addPhotos') }}
      </button>
      <input
        ref="fileInput"
        type="file"
        class="sr-only"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        @change="onFilesSelected"
      />
    </div>

    <div class="flex items-center justify-between gap-2">
      <button type="button" class="ui-btn-primary ui-btn-sm" :disabled="isSubmitting" @click="onPublish">
        {{ isSubmitting ? $t('common.saving') : $t('marketplace.publishNow') }}
      </button>
      <div class="flex flex-wrap justify-end gap-2">
        <button type="button" class="ui-btn-secondary ui-btn-sm" :disabled="isSubmitting" @click="onSave">
          {{ isSubmitting ? $t('common.saving') : $t('marketplace.saveDraft') }}
        </button>
        <button type="button" class="ui-btn-ghost ui-btn-sm" :disabled="isSubmitting" @click="emit('cancel')">
          {{ $t('common.cancel') }}
        </button>
      </div>
    </div>
  </form>
</template>
