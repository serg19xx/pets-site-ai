<script setup lang="ts">
import PhotoLightbox from '~/components/PhotoLightbox.vue'

export interface PetPhotoItem {
  id: number
  url: string
}

const props = defineProps<{
  photos: PetPhotoItem[]
  title?: string
}>()

const { t } = useI18n()

const heading = computed(() => props.title ?? t('pet.galleryTitle'))

const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

function openPhoto(index: number) {
  lightboxIndex.value = index
  lightboxOpen.value = true
}
</script>

<template>
  <section v-if="photos.length > 0" class="mt-6">
    <h2 class="ui-section-title mb-3">
      {{ heading }}
    </h2>
    <ul class="ui-pet-photos-grid list-none">
      <li v-for="(photo, index) in photos" :key="photo.id">
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
      </li>
    </ul>

    <PhotoLightbox
      v-model="lightboxOpen"
      :photos="photos"
      :initial-index="lightboxIndex"
      :title="heading"
    />
  </section>
</template>
