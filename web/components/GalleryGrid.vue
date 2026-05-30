<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import PetAvatar from '~/components/PetAvatar.vue'
import { ApiError } from '~/lib/auth-api'
import { togglePetLike } from '~/lib/pet-likes-api'
import { fetchGalleryPets } from '~/lib/pets-api'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { useAuthStore } from '~/stores/auth'
import type { GalleryPet } from '~/types/gallery'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const siteUrl = (config.public.siteUrl as string) || ''
const authUiReady = useAuthUiReady()

const PAGE_SIZE = 24
const auth = useAuthStore()

const extraPets = ref<GalleryPet[]>([])
const isLoadingMore = ref(false)
const loadMoreError = ref('')
const activeLikeId = ref<number | null>(null)
const interactionError = ref('')

const { data, pending, error, refresh } = await useAsyncData(
  () => `gallery-home-${locale.value}`,
  () =>
    fetchGalleryPets({
      limit: PAGE_SIZE,
      offset: 0,
      accessToken: authUiReady.value ? auth.accessToken : undefined,
    }),
  { watch: [locale] },
)

const pets = computed(() => [...(data.value?.pets ?? []), ...extraPets.value])
const total = computed(() => data.value?.total ?? 0)
const hasMore = computed(() => pets.value.length < total.value)
const isLoading = computed(() => pending.value && pets.value.length === 0)

const loadError = computed(() => {
  if (loadMoreError.value) {
    return loadMoreError.value
  }
  if (!error.value) {
    return ''
  }
  const err = error.value
  if (err instanceof ApiError) {
    return err.message
  }
  return t('gallery.loadError')
})

function speciesSubtitle(animal: GalleryPet) {
  const b = animal.breed?.label
  return b ? `${animal.species.label} · ${b}` : animal.species.label
}

function petPath(id: number) {
  return localePath(`/animals/${id}`)
}

watch(locale, () => {
  extraPets.value = []
  loadMoreError.value = ''
})

watch(
  authUiReady,
  (ready) => {
    if (ready) {
      extraPets.value = []
      void refresh()
    }
  },
)

async function loadMore() {
  if (!hasMore.value || isLoadingMore.value) {
    return
  }
  isLoadingMore.value = true
  loadMoreError.value = ''
  try {
    const { pets: list } = await fetchGalleryPets({
      limit: PAGE_SIZE,
      offset: pets.value.length,
      accessToken: authUiReady.value ? auth.accessToken : undefined,
    })
    extraPets.value.push(...list)
  } catch (err) {
    if (err instanceof ApiError) {
      loadMoreError.value = err.message
    } else {
      loadMoreError.value = t('gallery.loadMoreError')
    }
  } finally {
    isLoadingMore.value = false
  }
}

function updatePetState(petId: number, patch: Partial<GalleryPet>) {
  if (data.value) {
    data.value.pets = data.value.pets.map((pet) => (pet.id === petId ? { ...pet, ...patch } : pet))
  }
  extraPets.value = extraPets.value.map((pet) => (pet.id === petId ? { ...pet, ...patch } : pet))
}

async function onToggleLike(pet: GalleryPet) {
  const token = auth.accessToken
  if (!token || activeLikeId.value !== null) {
    interactionError.value = token ? '' : t('feed.loginToInteract')
    return
  }
  interactionError.value = ''
  activeLikeId.value = pet.id
  const prevLiked = pet.liked
  const prevCount = pet.likeCount
  updatePetState(pet.id, {
    liked: !prevLiked,
    likeCount: prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
  })
  try {
    const status = await togglePetLike(pet.id, token)
    updatePetState(pet.id, { liked: status.liked, likeCount: status.count })
  } catch (err) {
    updatePetState(pet.id, { liked: prevLiked, likeCount: prevCount })
    interactionError.value = err instanceof ApiError ? err.message : t('pet.likeToggleError')
  } finally {
    activeLikeId.value = null
  }
}

watch(
  pets,
  (list) => {
    if (!list.length || !siteUrl) {
      return
    }
    const itemListElement = list.map((animal, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${siteUrl.replace(/\/$/, '')}${localePath(`/animals/${animal.id}`)}`,
      name: animal.name,
    }))
    useHead({
      script: [
        {
          key: 'gallery-item-list',
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement,
          }),
        },
      ],
    })
  },
  { immediate: true },
)
</script>

<template>
  <p v-if="isLoading" class="ui-loading">{{ $t('gallery.loading') }}</p>
  <p v-else-if="loadError && pets.length === 0" class="ui-alert-error" role="alert">
    {{ loadError }}
  </p>
  <p v-else-if="pets.length === 0" class="ui-empty">
    {{ $t('gallery.empty') }}
  </p>

  <template v-else>
    <ul class="ui-gallery-grid">
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
            class="ui-feed-action-btn ui-feed-action-btn--like"
            :class="{ 'ui-feed-action-btn--liked': animal.liked }"
            :disabled="activeLikeId === animal.id || !authUiReady || !auth.isAuthenticated"
            @click="onToggleLike(animal)"
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
            <span>{{ animal.likeCount }}</span>
            <span class="sr-only">
              {{ animal.liked ? $t('pet.unlike') : $t('pet.like') }}
            </span>
          </button>
        </div>
      </li>
    </ul>

    <p v-if="loadError" class="ui-alert-error mt-4" role="alert">
      {{ loadError }}
    </p>
    <p v-else-if="interactionError" class="ui-alert-error mt-4" role="alert">
      {{ interactionError }}
    </p>

    <div v-if="hasMore" class="mt-6 flex justify-center">
      <button
        type="button"
        class="ui-btn-secondary ui-btn-md disabled:opacity-50"
        :disabled="isLoadingMore"
        @click="loadMore"
      >
        {{ isLoadingMore ? $t('gallery.loadingMore') : $t('gallery.loadMore') }}
      </button>
    </div>
  </template>
</template>
