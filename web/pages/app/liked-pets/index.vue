<script setup lang="ts">
import PetAvatar from '~/components/PetAvatar.vue'
import { ApiError } from '~/lib/auth-api'
import { togglePetLike } from '~/lib/pet-likes-api'
import { fetchLikedGalleryPets } from '~/lib/pets-api'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { useAuthStore } from '~/stores/auth'
import type { GalleryPet } from '~/types/gallery'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()

const pets = ref<GalleryPet[]>([])
const isLoading = ref(true)
const loadError = ref('')
const activeLikeId = ref<number | null>(null)

function petPath(id: number) {
  return localePath(`/animals/${id}`)
}

function speciesSubtitle(animal: GalleryPet) {
  const b = animal.breed?.label
  return b ? `${animal.species.label} · ${b}` : animal.species.label
}

async function loadPets() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const { pets: list } = await fetchLikedGalleryPets(token, { limit: 100 })
    pets.value = list
  } catch (err) {
    loadError.value = err instanceof ApiError ? err.message : t('likedPets.loadError')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadPets()
})

async function onUnlike(pet: GalleryPet) {
  const token = auth.accessToken
  if (!token || activeLikeId.value !== null) {
    return
  }
  activeLikeId.value = pet.id
  loadError.value = ''
  const prev = [...pets.value]
  pets.value = pets.value.filter((item) => item.id !== pet.id)
  try {
    await togglePetLike(pet.id, token)
  } catch (err) {
    pets.value = prev
    loadError.value = err instanceof ApiError ? err.message : t('likedPets.removeLikeError')
  } finally {
    activeLikeId.value = null
  }
}
</script>

<template>
  <section class="ui-page-container">
    <NuxtLink :to="localePath('/app/profile')" class="ui-link-back mb-0! inline-flex">
      <Icon :icon="UI_ACTION_ICONS.back" class="ui-icon-sm" aria-hidden="true" />
      {{ $t('likedPets.backToProfile') }}
    </NuxtLink>

    <h1 class="ui-page-title mt-4">{{ $t('likedPets.title') }}</h1>
    <p class="ui-page-subtitle mt-2">{{ $t('likedPets.subtitle') }}</p>

    <p v-if="isLoading" class="ui-loading mt-6">{{ $t('common.loading') }}</p>
    <p v-else-if="loadError" class="ui-alert-error mt-6" role="alert">
      {{ loadError }}
    </p>
    <p v-else-if="pets.length === 0" class="ui-empty mt-8">
      {{ $t('likedPets.empty') }}
    </p>

    <ul v-else class="ui-gallery-grid ui-gallery-grid--profile mt-6">
      <li v-for="animal in pets" :key="animal.id" class="ui-gallery-card">
        <NuxtLink :to="petPath(animal.id)" class="ui-gallery-card-link">
          <div class="ui-gallery-card-media">
            <PetAvatar :pet="animal" size="fill" />
          </div>
          <div class="ui-gallery-card-body">
            <h2 class="ui-gallery-card-title">{{ animal.name }}</h2>
            <p class="ui-gallery-card-meta">
              {{ speciesSubtitle(animal) }}
            </p>
          </div>
        </NuxtLink>
        <div class="border-t border-(--ui-border) px-2 py-1">
          <button
            type="button"
            class="ui-feed-action-btn ui-feed-action-btn--like ui-feed-action-btn--liked"
            :disabled="activeLikeId === animal.id"
            @click="onUnlike(animal)"
          >
            <svg
              viewBox="0 0 24 24"
              class="ui-feed-like-icon"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M19.5 12.5721L12 20L4.5 12.5721C3.0052 11.0921 2.75 8.79606 3.87868 7.01777C5.34777 4.70223 8.53553 4.19491 10.6716 5.96447L12 7.06531L13.3284 5.96447C15.4645 4.19491 18.6522 4.70223 20.1213 7.01777C21.25 8.79606 20.9948 11.0921 19.5 12.5721Z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>{{ $t('likedPets.removeLike') }}</span>
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>
