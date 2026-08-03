<script setup lang="ts">
import { ref, watch } from 'vue'

import ImageCropModal from '~/components/ImageCropModal.vue'
import PhotoLightbox from '~/components/PhotoLightbox.vue'
import { ApiError } from '~/lib/auth-api'
import { validateImageFile } from '~/lib/image-export'
import {
  deletePetCertificate,
  listPetCertificates,
  replacePetCertificateFile,
  uploadPetCertificate,
} from '~/lib/pets-api'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import type { PetCertificate } from '~/types/pet-certificate'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  petId: number
}>()

const { t } = useI18n()
const auth = useAuthStore()
const authUiReady = useAuthUiReady()

const certificates = ref<PetCertificate[]>([])
const isLoading = ref(false)
const isUploading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const isCropOpen = ref(false)
const pendingPhotoFile = ref<File | null>(null)
const cropCertificateId = ref<number | null>(null)
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

function openPhoto(index: number) {
  lightboxIndex.value = index
  lightboxOpen.value = true
}

async function loadCertificates() {
  const token = auth.accessToken
  if (!token || !authUiReady.value) {
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  try {
    const { certificates: list } = await listPetCertificates(token, props.petId)
    certificates.value = list
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('myPets.certificates.loadError')
  } finally {
    isLoading.value = false
  }
}

watch(
  [authUiReady, () => auth.accessToken, () => props.petId],
  ([ready, token]) => {
    if (ready && token) {
      void loadCertificates()
    }
  },
  { immediate: true },
)

function pickPhoto() {
  cropCertificateId.value = null
  fileInputRef.value?.click()
}

function pickCrop(certificateId: number) {
  cropCertificateId.value = certificateId
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
    if (cropCertificateId.value !== null) {
      const { certificate } = await replacePetCertificateFile(
        token,
        props.petId,
        cropCertificateId.value,
        file,
      )
      certificates.value = certificates.value.map((c) =>
        c.id === certificate.id ? certificate : c,
      )
      successMessage.value = t('myPets.certificates.photoCropped')
    } else {
      const { certificate } = await uploadPetCertificate(token, props.petId, file)
      certificates.value = [...certificates.value, certificate]
      successMessage.value = t('myPets.certificates.photoAdded')
    }
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('myPets.certificates.photoError')
  } finally {
    isUploading.value = false
    pendingPhotoFile.value = null
    cropCertificateId.value = null
  }
}

async function removeCertificate(certificateId: number) {
  const token = auth.accessToken
  if (!token) {
    return
  }
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await deletePetCertificate(token, props.petId, certificateId)
    certificates.value = certificates.value.filter((c) => c.id !== certificateId)
    successMessage.value = t('myPets.certificates.photoDeleted')
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError
        ? err.message
        : t('myPets.certificates.photoDeleteError')
  }
}
</script>

<template>
  <section v-if="authUiReady" class="mt-2 space-y-4">
    <p class="ui-hint">{{ $t('myPets.tabCertificatesHint') }}</p>

    <div class="ui-card ui-form-stack p-4">
      <div>
        <h2 class="text-base font-semibold">{{ $t('myPets.certificates.title') }}</h2>
        <p class="ui-hint mt-1">{{ $t('myPets.certificates.hint') }}</p>
      </div>

      <p v-if="isLoading" class="ui-caption">{{ $t('common.loading') }}</p>

      <p v-if="errorMessage" class="ui-alert-error" role="alert">
        {{ errorMessage }}
      </p>
      <p v-if="successMessage" class="ui-alert-success">
        {{ successMessage }}
      </p>

      <ul v-if="certificates.length > 0" class="ui-pet-photos-grid list-none">
        <li
          v-for="(certificate, index) in certificates"
          :key="certificate.id"
          class="group ui-pet-photo-tile"
        >
          <img
            :src="certificate.url"
            alt=""
            class="ui-pet-photo-open cursor-zoom-in"
            loading="lazy"
            decoding="async"
            @click="openPhoto(index)"
          />
          <div class="ui-pet-photo-actions" @click.stop>
            <button
              type="button"
              class="ui-pet-photo-action"
              :disabled="isUploading"
              :title="$t('myPets.certificates.cropPhoto')"
              @click="pickCrop(certificate.id)"
            >
              <Icon :icon="UI_ACTION_ICONS.edit" class="ui-icon-sm" aria-hidden="true" />
              <span class="sr-only">{{ $t('myPets.certificates.cropPhoto') }}</span>
            </button>
            <button
              type="button"
              class="ui-pet-photo-action ui-pet-photo-action--danger"
              :aria-label="$t('myPets.certificates.removePhoto')"
              @click="removeCertificate(certificate.id)"
            >
              <Icon :icon="UI_ACTION_ICONS.remove" class="ui-icon-sm" aria-hidden="true" />
            </button>
          </div>
        </li>
      </ul>

      <p v-else-if="!isLoading && !errorMessage" class="ui-caption">
        {{ $t('myPets.certificates.empty') }}
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
          {{
            isUploading
              ? $t('common.uploading')
              : $t('myPets.certificates.addPhoto')
          }}
        </button>
      </div>
    </div>

    <PhotoLightbox
      v-model="lightboxOpen"
      :photos="certificates"
      :initial-index="lightboxIndex"
      :title="$t('myPets.certificates.title')"
    />

    <ImageCropModal
      v-model="isCropOpen"
      :file="pendingPhotoFile"
      :title="
        cropCertificateId !== null
          ? $t('myPets.certificates.cropPhoto')
          : $t('myPets.certificates.addPhoto')
      "
      output-file-name="pet-certificate.jpg"
      free-aspect
      :max-output-size="1600"
      @confirm="onCropConfirm"
    />
  </section>
</template>
