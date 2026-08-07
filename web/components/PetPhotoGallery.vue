<script setup lang="ts">
import PhotoLightbox from '~/components/PhotoLightbox.vue'
import { pickPetCaption } from '~/lib/pick-pet-caption'

export interface PetPhotoItem {
  id: number
  url: string
  caption?: string | null
  captionFr?: string | null
}

const props = defineProps<{
  photos: PetPhotoItem[]
  title?: string
}>()

const { t, locale } = useI18n()

const heading = computed(() => props.title ?? t('pet.galleryTitle'))

const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

const lightboxPhotos = computed(() =>
  props.photos.map((photo) => ({
    id: photo.id,
    url: photo.url,
    caption: pickPetCaption(photo, locale.value),
  })),
)

function openPhoto(index: number) {
  lightboxIndex.value = index
  lightboxOpen.value = true
}

function tileCaption(photo: PetPhotoItem) {
  return pickPetCaption(photo, locale.value)
}
</script>

<template>
  <section v-if="photos.length > 0" class="mt-6">
    <h2 class="ui-section-title mb-3">
      {{ heading }}
    </h2>
    <ul class="ui-pet-photos-grid list-none">
      <li
        v-for="(photo, index) in photos"
        :key="photo.id"
        class="min-w-0"
      >
        <button
          type="button"
          class="ui-pet-photo-tile ui-pet-photo-tile--clickable group"
          :aria-label="$t('pet.openPhoto')"
          @click="openPhoto(index)"
        >
          <img
            :src="photo.url"
            alt=""
            class="ui-pet-photo-open"
            loading="lazy"
            decoding="async"
          />
        </button>
        <p
          v-if="tileCaption(photo)"
          class="ui-pet-photo-caption"
        >
          {{ tileCaption(photo) }}
        </p>
      </li>
    </ul>

    <PhotoLightbox
      v-model="lightboxOpen"
      :photos="lightboxPhotos"
      :initial-index="lightboxIndex"
      :title="heading"
    />
  </section>
</template>
