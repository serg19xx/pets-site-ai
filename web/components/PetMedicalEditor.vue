<script setup lang="ts">
import { ref, watch } from 'vue'

import ImageCropModal from '~/components/ImageCropModal.vue'
import PhotoLightbox from '~/components/PhotoLightbox.vue'
import { ApiError } from '~/lib/auth-api'
import { validateImageFile } from '~/lib/image-export'
import {
  createPetMedicalRecord,
  deletePetMedicalPhoto,
  deletePetMedicalRecord,
  listPetMedicalRecords,
  replacePetMedicalPhotoFile,
  updatePetMedicalRecord,
  uploadPetMedicalPhoto,
} from '~/lib/pets-api'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import type { PetMedicalPhoto, PetMedicalRecord } from '~/types/pet-medical'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  petId: number
}>()

const { t } = useI18n()
const auth = useAuthStore()
const authUiReady = useAuthUiReady()

const records = ref<PetMedicalRecord[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const isUploading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const editingId = ref<number | null>(null)
const showForm = ref(false)
const visitedOn = ref('')
const clinicName = ref('')
const doctorName = ref('')
const procedureLabel = ref('')
const notes = ref('')

const fileInputRef = ref<HTMLInputElement | null>(null)
const isCropOpen = ref(false)
const pendingPhotoFile = ref<File | null>(null)
const uploadRecordId = ref<number | null>(null)
const cropPhotoId = ref<number | null>(null)

const lightboxOpen = ref(false)
const lightboxPhotos = ref<PetMedicalPhoto[]>([])
const lightboxIndex = ref(0)

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function resetForm() {
  editingId.value = null
  visitedOn.value = todayIso()
  clinicName.value = ''
  doctorName.value = ''
  procedureLabel.value = ''
  notes.value = ''
}

function openCreateForm() {
  resetForm()
  showForm.value = true
  errorMessage.value = ''
  successMessage.value = ''
}

function openEditForm(record: PetMedicalRecord) {
  editingId.value = record.id
  visitedOn.value = record.visitedOn
  clinicName.value = record.clinicName ?? ''
  doctorName.value = record.doctorName ?? ''
  procedureLabel.value = record.procedureLabel
  notes.value = record.notes ?? ''
  showForm.value = true
  errorMessage.value = ''
  successMessage.value = ''
}

function cancelForm() {
  showForm.value = false
  resetForm()
}

async function loadRecords() {
  const token = auth.accessToken
  if (!token || !authUiReady.value) {
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  try {
    const { records: list } = await listPetMedicalRecords(token, props.petId)
    records.value = list
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('myPets.medical.loadError')
  } finally {
    isLoading.value = false
  }
}

watch(
  [authUiReady, () => auth.accessToken, () => props.petId],
  ([ready, token]) => {
    if (ready && token) {
      void loadRecords()
    }
  },
  { immediate: true },
)

async function saveRecord() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  if (!visitedOn.value || !procedureLabel.value.trim()) {
    errorMessage.value = t('myPets.medical.requiredFields')
    return
  }

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  const body = {
    visitedOn: visitedOn.value,
    clinicName: clinicName.value.trim() || null,
    doctorName: doctorName.value.trim() || null,
    procedureLabel: procedureLabel.value.trim(),
    notes: notes.value.trim() || null,
  }
  try {
    if (editingId.value !== null) {
      const { record } = await updatePetMedicalRecord(
        token,
        props.petId,
        editingId.value,
        body,
      )
      records.value = records.value.map((r) => (r.id === record.id ? record : r))
      successMessage.value = t('myPets.medical.saved')
    } else {
      const { record } = await createPetMedicalRecord(token, props.petId, body)
      records.value = [record, ...records.value]
      successMessage.value = t('myPets.medical.created')
    }
    showForm.value = false
    resetForm()
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('myPets.medical.saveError')
  } finally {
    isSaving.value = false
  }
}

async function removeRecord(recordId: number) {
  const token = auth.accessToken
  if (!token) {
    return
  }
  if (!window.confirm(t('myPets.medical.deleteConfirm'))) {
    return
  }
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await deletePetMedicalRecord(token, props.petId, recordId)
    records.value = records.value.filter((r) => r.id !== recordId)
    if (editingId.value === recordId) {
      cancelForm()
    }
    successMessage.value = t('myPets.medical.deleted')
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('myPets.medical.deleteError')
  }
}

function pickPhoto(recordId: number, photoId: number | null = null) {
  uploadRecordId.value = recordId
  cropPhotoId.value = photoId
  fileInputRef.value?.click()
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || uploadRecordId.value === null) {
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
  const recordId = uploadRecordId.value
  if (!token || recordId === null) {
    return
  }
  isUploading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    if (cropPhotoId.value !== null) {
      const { photo } = await replacePetMedicalPhotoFile(
        token,
        props.petId,
        recordId,
        cropPhotoId.value,
        file,
      )
      records.value = records.value.map((r) =>
        r.id === recordId
          ? {
              ...r,
              photos: r.photos.map((p) => (p.id === photo.id ? photo : p)),
            }
          : r,
      )
      successMessage.value = t('myPets.medical.photoCropped')
    } else {
      const { photo } = await uploadPetMedicalPhoto(token, props.petId, recordId, file)
      records.value = records.value.map((r) =>
        r.id === recordId ? { ...r, photos: [...r.photos, photo] } : r,
      )
      successMessage.value = t('myPets.medical.photoAdded')
    }
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('myPets.medical.photoError')
  } finally {
    isUploading.value = false
    pendingPhotoFile.value = null
    uploadRecordId.value = null
    cropPhotoId.value = null
  }
}

async function removePhoto(recordId: number, photoId: number) {
  const token = auth.accessToken
  if (!token) {
    return
  }
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await deletePetMedicalPhoto(token, props.petId, recordId, photoId)
    records.value = records.value.map((r) =>
      r.id === recordId
        ? { ...r, photos: r.photos.filter((p) => p.id !== photoId) }
        : r,
    )
    successMessage.value = t('myPets.medical.photoDeleted')
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('myPets.medical.photoDeleteError')
  }
}

function openLightbox(record: PetMedicalRecord, index: number) {
  lightboxPhotos.value = record.photos
  lightboxIndex.value = index
  lightboxOpen.value = true
}
</script>

<template>
  <div v-if="authUiReady" class="mt-2 space-y-4">
    <p class="ui-hint">{{ $t('myPets.tabMedicalHint') }}</p>

    <p v-if="errorMessage" class="ui-alert-error" role="alert">
      {{ errorMessage }}
    </p>
    <p v-if="successMessage" class="ui-alert-success">
      {{ successMessage }}
    </p>

    <p v-if="isLoading" class="ui-hint">{{ $t('common.loading') }}</p>

    <template v-else>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="ui-btn-primary ui-btn-sm"
          :disabled="showForm"
          @click="openCreateForm"
        >
          {{ $t('myPets.medical.addRecord') }}
        </button>
      </div>

      <form
        v-if="showForm"
        class="ui-card ui-form-stack p-4"
        @submit.prevent="saveRecord"
      >
        <h2 class="text-base font-semibold">
          {{
            editingId !== null
              ? $t('myPets.medical.editRecord')
              : $t('myPets.medical.newRecord')
          }}
        </h2>

        <label class="ui-field">
          {{ $t('myPets.medical.visitedOn') }}
          <input
            v-model="visitedOn"
            type="date"
            required
            class="ui-input"
          />
        </label>

        <label class="ui-field">
          {{ $t('myPets.medical.clinicName') }}
          <input
            v-model="clinicName"
            type="text"
            maxlength="200"
            class="ui-input"
          />
        </label>

        <label class="ui-field">
          {{ $t('myPets.medical.doctorName') }}
          <input
            v-model="doctorName"
            type="text"
            maxlength="200"
            class="ui-input"
          />
        </label>

        <label class="ui-field">
          {{ $t('myPets.medical.procedureLabel') }}
          <input
            v-model="procedureLabel"
            type="text"
            required
            maxlength="300"
            class="ui-input"
            :placeholder="$t('myPets.medical.procedurePlaceholder')"
          />
        </label>

        <label class="ui-field">
          {{ $t('myPets.medical.notes') }}
          <textarea
            v-model="notes"
            class="ui-textarea"
            rows="3"
            maxlength="2000"
            :placeholder="$t('myPets.medical.notesPlaceholder')"
          />
        </label>

        <div class="ui-form-actions">
          <button
            type="submit"
            class="ui-btn-primary ui-btn-md"
            :disabled="isSaving"
          >
            {{ isSaving ? $t('common.saving') : $t('common.save') }}
          </button>
          <button
            type="button"
            class="ui-btn-secondary ui-btn-md"
            :disabled="isSaving"
            @click="cancelForm"
          >
            {{ $t('common.cancel') }}
          </button>
        </div>
      </form>

      <p v-if="records.length === 0" class="ui-hint">
        {{ $t('myPets.medical.empty') }}
      </p>

      <article
        v-for="record in records"
        :key="record.id"
        class="ui-card ui-form-stack p-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 class="text-base font-semibold">{{ record.procedureLabel }}</h3>
            <p class="ui-hint mt-1">{{ record.visitedOn }}</p>
            <p v-if="record.clinicName" class="mt-1 text-sm">
              {{ record.clinicName }}
              <span v-if="record.doctorName"> · {{ record.doctorName }}</span>
            </p>
            <p v-else-if="record.doctorName" class="mt-1 text-sm">
              {{ record.doctorName }}
            </p>
            <p v-if="record.notes" class="mt-2 text-sm whitespace-pre-wrap">
              {{ record.notes }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="ui-btn-secondary ui-btn-sm"
              @click="openEditForm(record)"
            >
              {{ $t('common.edit') }}
            </button>
            <button
              type="button"
              class="ui-btn-secondary ui-btn-sm"
              @click="removeRecord(record.id)"
            >
              {{ $t('common.remove') }}
            </button>
          </div>
        </div>

        <div>
          <p class="mb-2 text-sm font-medium">{{ $t('myPets.medical.photos') }}</p>
          <ul
            v-if="record.photos.length > 0"
            class="ui-pet-photos-grid list-none"
          >
            <li
              v-for="(photo, index) in record.photos"
              :key="photo.id"
              class="group ui-pet-photo-tile"
            >
              <img
                :src="photo.url"
                alt=""
                class="ui-pet-photo-open cursor-zoom-in"
                loading="lazy"
                decoding="async"
                @click="openLightbox(record, index)"
              />
              <div class="ui-pet-photo-actions" @click.stop>
                <button
                  type="button"
                  class="ui-pet-photo-action"
                  :disabled="isUploading"
                  :title="$t('myPets.medical.cropPhoto')"
                  @click="pickPhoto(record.id, photo.id)"
                >
                  <Icon :icon="UI_ACTION_ICONS.edit" class="ui-icon-sm" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="ui-pet-photo-action ui-pet-photo-action--danger"
                  :aria-label="$t('myPets.medical.removePhoto')"
                  @click="removePhoto(record.id, photo.id)"
                >
                  <Icon :icon="UI_ACTION_ICONS.remove" class="ui-icon-sm" aria-hidden="true" />
                </button>
              </div>
            </li>
          </ul>
          <p v-else class="ui-hint">{{ $t('myPets.medical.noPhotos') }}</p>
          <button
            v-if="record.photos.length < 6"
            type="button"
            class="ui-btn-secondary ui-btn-sm mt-2"
            :disabled="isUploading"
            @click="pickPhoto(record.id)"
          >
            {{
              isUploading
                ? $t('common.uploading')
                : $t('myPets.medical.addPhoto')
            }}
          </button>
        </div>
      </article>
    </template>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      class="hidden"
      @change="onFileSelected"
    />

    <PhotoLightbox
      v-model="lightboxOpen"
      :photos="lightboxPhotos"
      :initial-index="lightboxIndex"
      :title="$t('myPets.medical.photos')"
    />

    <ImageCropModal
      v-model="isCropOpen"
      :file="pendingPhotoFile"
      :title="
        cropPhotoId !== null
          ? $t('myPets.medical.cropPhoto')
          : $t('myPets.medical.addPhoto')
      "
      output-file-name="pet-medical.jpg"
      free-aspect
      :max-output-size="1600"
      @confirm="onCropConfirm"
    />
  </div>
</template>
