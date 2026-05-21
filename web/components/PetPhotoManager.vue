<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import ImageCropModal from '~/components/ImageCropModal.vue'
import PetAvatar from '~/components/PetAvatar.vue'
import PhotoLightbox from '~/components/PhotoLightbox.vue'
import { ApiError } from '~/lib/auth-api'
import { validateImageFile } from '~/lib/image-export'
import {
  deletePetPhoto,
  getPet,
  listPetPhotos,
  replacePetPhotoFile,
  setPetCoverPhoto,
  uploadPetPhoto,
} from '~/lib/pets-api'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import type { PetPhoto } from '~/types/pet-photo'
import type { Pet } from '~/types/pet'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  petId: number
  speciesSlug: string
}>()

const emit = defineEmits<{
  'pet-updated': [pet: Pet]
}>()

const { t } = useI18n()
const auth = useAuthStore()
const authUiReady = useAuthUiReady()

const photos = ref<PetPhoto[]>([])
const previewPet = ref<Pet | null>(null)
const isLoading = ref(false)
const isUploading = ref(false)
const isBusy = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const isCropOpen = ref(false)
const pendingPhotoFile = ref<File | null>(null)
const cropPhotoId = ref<number | null>(null)
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

const displayPet = computed(() => previewPet.value)

function openPhoto(index: number) {
  lightboxIndex.value = index
  lightboxOpen.value = true
}

async function refreshPet() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  const { pet } = await getPet(token, props.petId)
  previewPet.value = pet
  emit('pet-updated', pet)
}

async function loadPhotos() {
  const token = auth.accessToken
  if (!token || !authUiReady.value) {
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [{ photos: list }, petResult] = await Promise.all([
      listPetPhotos(token, props.petId),
      getPet(token, props.petId),
    ])
    photos.value = list
    previewPet.value = petResult.pet
    emit('pet-updated', petResult.pet)
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('myPets.galleryLoadError')
  } finally {
    isLoading.value = false
  }
}

watch(
  [authUiReady, () => auth.accessToken, () => props.petId],
  ([ready, token]) => {
    if (ready && token) {
      void loadPhotos()
    }
  },
  { immediate: true },
)

function pickPhoto() {
  cropPhotoId.value = null
  fileInputRef.value?.click()
}

function pickCrop(photoId: number) {
  cropPhotoId.value = photoId
  fileInputRef.value?.click()
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }
  const validationError = validateImageFile(file)
  if (validationError) {
    errorMessage.value = validationError
    return
  }
  errorMessage.value = ''
  pendingPhotoFile.value = file
  isCropOpen.value = true
}

async function onCropConfirm(file: File) {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isUploading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    if (cropPhotoId.value !== null) {
      const { photo } = await replacePetPhotoFile(token, props.petId, cropPhotoId.value, file)
      photos.value = photos.value.map((p) => (p.id === photo.id ? photo : p))
      successMessage.value = t('myPets.galleryPhotoCropped')
      await refreshPet()
    } else {
      const { photo } = await uploadPetPhoto(token, props.petId, file)
      photos.value = [...photos.value, photo]
      successMessage.value = t('myPets.galleryPhotoAdded')
      await refreshPet()
    }
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('myPets.galleryPhotoError')
  } finally {
    isUploading.value = false
    pendingPhotoFile.value = null
    cropPhotoId.value = null
  }
}

async function makeCover(photoId: number) {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isBusy.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const { pet } = await setPetCoverPhoto(token, props.petId, photoId)
    previewPet.value = pet
    photos.value = photos.value.map((p) => ({
      ...p,
      isCover: p.id === photoId,
    }))
    emit('pet-updated', pet)
    successMessage.value = t('myPets.coverPhotoSet')
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('myPets.coverPhotoError')
  } finally {
    isBusy.value = false
  }
}

async function removePhoto(photoId: number) {
  const token = auth.accessToken
  if (!token) {
    return
  }
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await deletePetPhoto(token, props.petId, photoId)
    photos.value = photos.value.filter((p) => p.id !== photoId)
    successMessage.value = t('myPets.galleryPhotoDeleted')
    await refreshPet()
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('myPets.galleryPhotoDeleteError')
  }
}
</script>

<template>
  <section v-if="authUiReady" class="ui-card ui-form-stack mt-6">
    <div>
      <h2 class="ui-h3">{{ $t('myPets.galleryTitle') }}</h2>
      <p class="ui-page-subtitle mt-1">
        {{ $t('myPets.galleryHint') }}
      </p>
    </div>

    <div v-if="displayPet" class="ui-photo-row">
      <PetAvatar :pet="displayPet" :species-slug="speciesSlug" size="lg" />
      <p class="ui-caption max-w-xs">
        {{ $t('myPets.coverPreviewHint') }}
      </p>
    </div>

    <p v-if="isLoading" class="ui-caption">{{ $t('common.loading') }}</p>

    <p v-if="errorMessage" class="ui-alert-error" role="alert">
      {{ errorMessage }}
    </p>
    <p v-if="successMessage" class="ui-alert-success">
      {{ successMessage }}
    </p>

    <ul v-if="photos.length > 0" class="ui-pet-photos-grid list-none">
      <li
        v-for="(photo, index) in photos"
        :key="photo.id"
        class="group ui-pet-photo-tile"
        :class="{ 'ui-pet-photo-tile--cover': photo.isCover }"
      >
        <span v-if="photo.isCover" class="ui-pet-photo-cover-badge">
          {{ $t('myPets.coverBadge') }}
        </span>
        <img
          :src="photo.url"
          alt=""
          class="ui-pet-photo-open cursor-zoom-in"
          loading="lazy"
          decoding="async"
          @click="openPhoto(index)"
        />
        <div class="ui-pet-photo-actions" @click.stop>
          <button
            v-if="!photo.isCover"
            type="button"
            class="ui-pet-photo-action"
            :disabled="isBusy"
            :title="$t('myPets.setAsCover')"
            @click="makeCover(photo.id)"
          >
            <Icon :icon="UI_ACTION_ICONS.star" class="ui-icon-sm" aria-hidden="true" />
            <span class="sr-only">{{ $t('myPets.setAsCover') }}</span>
          </button>
          <button
            type="button"
            class="ui-pet-photo-action"
            :disabled="isUploading"
            :title="$t('myPets.cropPhoto')"
            @click="pickCrop(photo.id)"
          >
            <Icon :icon="UI_ACTION_ICONS.edit" class="ui-icon-sm" aria-hidden="true" />
            <span class="sr-only">{{ $t('myPets.cropPhoto') }}</span>
          </button>
          <button
            type="button"
            class="ui-pet-photo-action ui-pet-photo-action--danger"
            :aria-label="$t('myPets.removeGalleryPhoto')"
            @click="removePhoto(photo.id)"
          >
            <Icon :icon="UI_ACTION_ICONS.remove" class="ui-icon-sm" aria-hidden="true" />
          </button>
        </div>
      </li>
    </ul>

    <p v-else-if="!isLoading && !errorMessage" class="ui-caption">
      {{ $t('myPets.galleryEmpty') }}
    </p>

    <div>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        class="hidden"
        @change="onFileSelected"
      />
      <button
        type="button"
        class="ui-btn-secondary ui-btn-sm"
        :disabled="isUploading || isLoading"
        @click="pickPhoto"
      >
        {{ isUploading ? $t('common.uploading') : $t('myPets.addGalleryPhoto') }}
      </button>
    </div>

    <PhotoLightbox
      v-model="lightboxOpen"
      :photos="photos"
      :initial-index="lightboxIndex"
      :title="displayPet?.name"
    />

    <ImageCropModal
      v-model="isCropOpen"
      :file="pendingPhotoFile"
      :title="cropPhotoId !== null ? $t('myPets.cropPhoto') : $t('myPets.addGalleryPhoto')"
      output-file-name="pet-gallery.jpg"
      free-aspect
      :max-output-size="1600"
      @confirm="onCropConfirm"
    />
  </section>
</template>
