<script setup lang="ts">
import PhotoLightbox from '~/components/PhotoLightbox.vue'
import type { MedicalShareView, PetMedicalPhoto } from '~/types/pet-medical'

const props = defineProps<{
  share: MedicalShareView
}>()

const { t } = useI18n()
const { formatIso } = useDateTime()

const lightboxOpen = ref(false)
const lightboxPhotos = ref<PetMedicalPhoto[]>([])
const lightboxIndex = ref(0)

function openLightbox(photos: PetMedicalPhoto[], index: number) {
  lightboxPhotos.value = photos
  lightboxIndex.value = index
  lightboxOpen.value = true
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function printPage() {
  window.print()
}

function downloadHtml() {
  const { pet, records, expiresAt } = props.share
  const visits = records
    .map((record) => {
      const photos = record.photos
        .map((photo) => `<p><img src="${escapeHtml(photo.url)}" alt="" width="320" /></p>`)
        .join('')
      return `<article>
        <h2>${escapeHtml(record.procedureLabel)}</h2>
        <p>${escapeHtml(record.visitedOn)}</p>
        <p>${escapeHtml([record.clinicName, record.doctorName].filter(Boolean).join(' · '))}</p>
        <pre>${escapeHtml(record.notes ?? '')}</pre>
        ${photos}
      </article>`
    })
    .join('\n')
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(pet.name)} — medical records</title>
</head>
<body>
  <h1>${escapeHtml(pet.name)}</h1>
  <p>Shared until ${escapeHtml(expiresAt)}. Read-only copy from Pet Friends.</p>
  ${visits || '<p>No visits on file.</p>'}
</body>
</html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${pet.name.replace(/\s+/g, '-').toLowerCase()}-medical.html`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-4">
    <p class="ui-hint">
      {{ $t('pet.medicalShareExpires', { when: formatIso(share.expiresAt) }) }}
    </p>
    <div class="flex flex-wrap gap-2">
      <button type="button" class="ui-btn-secondary ui-btn-sm" @click="downloadHtml">
        {{ $t('pet.medicalShareDownload') }}
      </button>
      <button type="button" class="ui-btn-secondary ui-btn-sm" @click="printPage">
        {{ $t('pet.medicalSharePrint') }}
      </button>
    </div>

    <p v-if="share.records.length === 0" class="ui-hint">
      {{ $t('myPets.medical.empty') }}
    </p>

    <article
      v-for="record in share.records"
      :key="record.id"
      class="ui-card ui-form-stack p-4"
    >
      <h2 class="text-base font-semibold">{{ record.procedureLabel }}</h2>
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
      <ul
        v-if="record.photos.length > 0"
        class="ui-pet-photos-grid mt-3 list-none"
      >
        <li v-for="(photo, index) in record.photos" :key="photo.id">
          <button
            type="button"
            class="ui-pet-photo-tile ui-pet-photo-tile--clickable"
            :aria-label="$t('pet.openPhoto')"
            @click="openLightbox(record.photos, index)"
          >
            <img
              :src="photo.url"
              alt=""
              class="ui-pet-photo-open"
              loading="lazy"
              decoding="async"
            />
          </button>
        </li>
      </ul>
    </article>

    <PhotoLightbox
      v-model="lightboxOpen"
      :photos="lightboxPhotos"
      :initial-index="lightboxIndex"
      :title="$t('myPets.medical.photos')"
    />
  </div>
</template>
