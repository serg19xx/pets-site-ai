<script setup lang="ts">
import LikeButton from '~/components/LikeButton.vue'
import PetAvatar from '~/components/PetAvatar.vue'
import PetPhotoGallery from '~/components/PetPhotoGallery.vue'
import PetMemberLink from '~/components/PetMemberLink.vue'
import PetProfileDetails from '~/components/PetProfileDetails.vue'
import PhotoLightbox, { type LightboxPhoto } from '~/components/PhotoLightbox.vue'
import { ApiError } from '~/lib/auth-api'
import { pickPetGreeting } from '~/lib/pick-pet-greeting'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { fetchGalleryPet } from '~/lib/pets-api'
import type { GalleryPet } from '~/types/gallery'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl).replace(/\/$/, '')

const route = useRoute()
const petId = computed(() => Number(route.params.id))

const { data: pet, error: loadError, pending } = await useAsyncData(
  () => `gallery-pet-${petId.value}-${locale.value}`,
  async () => {
    const id = petId.value
    if (!Number.isInteger(id) || id < 1) {
      throw new ApiError(t('pet.invalidId'), 400)
    }
    const { pet: loaded } = await fetchGalleryPet(id)
    return loaded
  },
  { watch: [petId, locale] },
)

const isLoading = computed(() => pending.value && !pet.value)

const displayGreeting = computed(() =>
  pet.value ? pickPetGreeting(pet.value, locale.value) : null,
)

const subtitle = computed(() => {
  const p = pet.value
  if (!p) {
    return ''
  }
  const b = p.breed?.label
  return b ? `${p.species.label} · ${b}` : p.species.label
})

const viewerPhotos = computed((): LightboxPhoto[] => {
  const p = pet.value
  if (!p) {
    return []
  }
  const items: LightboxPhoto[] = [...(p.photos ?? [])]
  if (p.avatarUrl && !items.some((photo) => photo.url === p.avatarUrl)) {
    items.unshift({ id: 0, url: p.avatarUrl })
  }
  return items
})

const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

function openViewer(index = 0) {
  if (viewerPhotos.value.length === 0) {
    return
  }
  lightboxIndex.value = index
  lightboxOpen.value = true
}

const errorMessage = computed(() => {
  if (!loadError.value) {
    return ''
  }
  const err = loadError.value
  if (err instanceof ApiError && err.status === 404) {
    return t('pet.notFound')
  }
  if (err instanceof ApiError) {
    return err.message
  }
  return t('pet.loadError')
})

const pageTitle = computed(() =>
  pet.value ? t('meta.pet.titleNamed', { name: pet.value.name }) : t('meta.pet.title'),
)

const pageDescription = computed(() =>
  pet.value
    ? t('meta.pet.descriptionNamed', {
        name: pet.value.name,
        species: pet.value.species.label,
      })
    : t('meta.pet.description'),
)

const canonicalPath = computed(() => localePath(`/animals/${petId.value}`))

const jsonLd = computed(() => {
  const p = pet.value
  if (!p) {
    return undefined
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Thing',
    name: p.name,
    description: subtitle.value,
    url: `${siteUrl}${canonicalPath.value}`,
  }
})

usePageSeo({
  title: pageTitle,
  description: pageDescription,
  path: canonicalPath,
  jsonLd,
})
</script>

<template>
  <section class="ui-page-container">
    <div class="mb-4">
      <NuxtLink
        :to="localePath('/')"
        class="ui-link-back mb-0! inline-flex"
      >
        <Icon :icon="UI_ACTION_ICONS.back" class="ui-icon-sm" aria-hidden="true" />
        {{ $t('pet.backToGallery') }}
      </NuxtLink>
    </div>

    <p v-if="isLoading" class="ui-loading">{{ $t('pet.loading') }}</p>
    <p
      v-else-if="errorMessage"
      class="ui-alert-error"
      role="alert"
    >
      {{ errorMessage }}
    </p>

    <article v-else-if="pet" class="ui-pet-page">
      <div class="ui-pet-page-grid">
        <div class="ui-pet-hero-card">
          <div class="ui-pet-hero-head">
            <div class="ui-pet-hero-title">
              <h1 class="ui-h1">{{ pet.name }}</h1>
              <p class="ui-pet-hero-subtitle">{{ subtitle }}</p>
            </div>
            <LikeButton :pet-id="pet.id" :pet-name="pet.name" />
          </div>

          <div class="ui-pet-hero-media ui-pet-hero-media--square">
            <button
              v-if="viewerPhotos.length > 0"
              type="button"
              class="ui-media-frame ui-media-frame--clickable h-full w-full"
              :aria-label="$t('pet.openPhoto')"
              @click="openViewer(0)"
            >
              <PetAvatar :pet="pet" size="fill" />
            </button>
            <div v-else class="ui-media-frame h-full w-full">
              <PetAvatar :pet="pet" size="fill" />
            </div>
          </div>

          <div v-if="displayGreeting" class="ui-pet-hero-greeting">
            <p class="ui-pet-hero-greeting-label">{{ $t('pet.greetingLabel') }}</p>
            <blockquote class="ui-pet-greeting">
              <p>{{ displayGreeting }}</p>
            </blockquote>
          </div>
        </div>

        <div
          v-if="pet.description"
          class="ui-pet-page-about-desktop ui-pet-description"
        >
          <h2 class="ui-section-title">{{ $t('pet.about') }}</h2>
          <p class="ui-prose mt-3 whitespace-pre-wrap">{{ pet.description }}</p>
        </div>

        <div
          v-if="pet.member"
          class="hidden items-center gap-3 lg:col-span-2 lg:flex"
          :class="pet.description ? 'lg:justify-end' : 'lg:justify-between'"
        >
          <h2 v-if="!pet.description" class="ui-section-title">{{ $t('pet.about') }}</h2>
          <PetMemberLink :member="pet.member" />
        </div>
      </div>

      <PetMemberLink
        v-if="pet.member"
        :member="pet.member"
        class="lg:hidden"
      />

      <PetProfileDetails
        :pet="pet"
        :show-greeting="false"
        :show-about="false"
      />

      <div
        v-if="pet.description"
        class="ui-pet-page-about-mobile ui-pet-description"
      >
        <h2 class="ui-section-title">{{ $t('pet.about') }}</h2>
        <p class="ui-prose mt-3 whitespace-pre-wrap">{{ pet.description }}</p>
      </div>

      <PetPhotoGallery :photos="pet.photos ?? []" :title="pet.name" />

      <PhotoLightbox
        v-model="lightboxOpen"
        :photos="viewerPhotos"
        :initial-index="lightboxIndex"
        :title="pet.name"
      />
    </article>
  </section>
</template>
