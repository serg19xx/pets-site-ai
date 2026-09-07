<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import PetAvatar from '~/components/PetAvatar.vue'
import PetVirtualBadge from '~/components/PetVirtualBadge.vue'
import { ApiError } from '~/lib/auth-api'
import { pickGalleryCardVoice } from '~/lib/pick-pet-caption'
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
const { isAuthenticated, accessToken } = storeToRefs(auth)

/** Guests see the count only; members can toggle. */
const canLike = computed(() => Boolean(accessToken.value) && isAuthenticated.value)

/** Soft cartoon plate colors — cycle by pet id (warm pastels, not one purple theme). */
const GALLERY_PLATES = [
  '#FFE4CC',
  '#DFF3E4',
  '#D6EAF8',
  '#FFE9B8',
  '#F8D7E3',
  '#D5F2F0',
  '#E8DFD4',
  '#F3E0C8',
] as const

function plateForPet(id: number) {
  return GALLERY_PLATES[Math.abs(id) % GALLERY_PLATES.length]
}

const extraPets = ref<GalleryPet[]>([])
const isLoadingMore = ref(false)
const loadMoreError = ref('')
const activeLikeId = ref<number | null>(null)
const openVoiceId = ref<number | null>(null)
const interactionError = ref('')
const gridRef = ref<HTMLElement | null>(null)
const balloonRef = ref<HTMLElement | null>(null)
const balloonStyle = ref<Record<string, string>>({})

function closeVoice() {
  openVoiceId.value = null
}

function toggleVoice(petId: number) {
  openVoiceId.value = openVoiceId.value === petId ? null : petId
}

function onVoiceDismissPointer(event: Event) {
  if (!openVoiceId.value) {
    return
  }
  const target = event.target
  if (!(target instanceof Node)) {
    return
  }
  // Another voice button switches via toggleVoice; don't dismiss first.
  if (target instanceof Element && target.closest('[data-voice-btn]')) {
    return
  }
  if (balloonRef.value?.contains(target)) {
    return
  }
  closeVoice()
}

function onVoiceDismissKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && openVoiceId.value) {
    closeVoice()
  }
}

function updateBalloonPosition() {
  const petId = openVoiceId.value
  const grid = gridRef.value
  if (!petId || !grid) {
    balloonStyle.value = {}
    return
  }
  const btn = grid.querySelector(`[data-voice-btn="${petId}"]`)
  if (!(btn instanceof HTMLElement)) {
    balloonStyle.value = {}
    return
  }
  const gridRect = grid.getBoundingClientRect()
  const btnRect = btn.getBoundingClientRect()
  const card = btn.closest('.ui-gallery-card')
  const cardWidth =
    card instanceof HTMLElement ? card.getBoundingClientRect().width : btnRect.width
  const gapRaw = getComputedStyle(grid).columnGap || getComputedStyle(grid).gap || '0'
  const gap = Number.parseFloat(gapRaw) || 0
  const pad = 8
  const gridLeft = Math.max(8, gridRect.left + pad)
  const gridRight = Math.min(window.innerWidth - 8, gridRect.right - pad)
  const gridInner = Math.max(0, gridRight - gridLeft)
  // Cap at ~2 cards (full width on 2-col mobile; compact on 3–4 col desktops).
  const twoCards = cardWidth * 2 + gap
  const width = Math.min(gridInner, Math.max(cardWidth, twoCards))
  const preferredLeft = btnRect.left + btnRect.width / 2 - width / 2
  const left = Math.min(Math.max(preferredLeft, gridLeft), gridRight - width)
  const bottom = Math.max(8, window.innerHeight - btnRect.top + 10)
  const tailLeft = Math.min(
    Math.max(18, btnRect.left + btnRect.width / 2 - left - 6),
    Math.max(18, width - 28),
  )
  balloonStyle.value = {
    left: `${left}px`,
    width: `${width}px`,
    bottom: `${bottom}px`,
    '--gallery-balloon-tail-left': `${tailLeft}px`,
  }
}

async function refreshBalloonPosition() {
  await nextTick()
  updateBalloonPosition()
}

const { data, pending, error, refresh } = await useAsyncData(
  () => `gallery-animals-${locale.value}`,
  () =>
    fetchGalleryPets({
      limit: PAGE_SIZE,
      offset: 0,
      accessToken: canLike.value ? accessToken.value ?? undefined : undefined,
    }),
  { watch: [locale] },
)

const pets = computed(() => [...(data.value?.pets ?? []), ...extraPets.value])
const total = computed(() => data.value?.total ?? 0)
const hasMore = computed(() => pets.value.length < total.value)
const isLoading = computed(() => pending.value && pets.value.length === 0)
const openVoicePet = computed(
  () => pets.value.find((pet) => pet.id === openVoiceId.value) ?? null,
)
const openVoiceText = computed(() =>
  openVoicePet.value ? cardCaption(openVoicePet.value) : '',
)

watch(openVoiceId, (id) => {
  if (id) {
    void refreshBalloonPosition()
  } else {
    balloonStyle.value = {}
  }
})

onMounted(() => {
  window.addEventListener('scroll', updateBalloonPosition, true)
  window.addEventListener('resize', updateBalloonPosition)
  document.addEventListener('pointerdown', onVoiceDismissPointer, true)
  document.addEventListener('keydown', onVoiceDismissKey)
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateBalloonPosition, true)
  window.removeEventListener('resize', updateBalloonPosition)
  document.removeEventListener('pointerdown', onVoiceDismissPointer, true)
  document.removeEventListener('keydown', onVoiceDismissKey)
})

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

function cardCaption(animal: GalleryPet) {
  return pickGalleryCardVoice(animal, locale.value)
}

function petPath(id: number) {
  return localePath(`/gallery/${id}`)
}

watch(locale, () => {
  extraPets.value = []
  loadMoreError.value = ''
})

watch(
  [authUiReady, canLike, accessToken],
  ([ready]) => {
    if (!ready) {
      return
    }
    extraPets.value = []
    void refresh()
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
      accessToken: canLike.value ? accessToken.value ?? undefined : undefined,
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
  const token = accessToken.value
  if (!canLike.value || !token) {
    interactionError.value = t('feed.loginToInteract')
    return
  }
  if (activeLikeId.value !== null) {
    return
  }
  interactionError.value = ''
  activeLikeId.value = pet.id
  const prevLiked = pet.liked
  const prevCount = pet.likeCount
  try {
    updatePetState(pet.id, {
      liked: !prevLiked,
      likeCount: prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
    })
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
      url: `${siteUrl.replace(/\/$/, '')}${localePath(`/gallery/${animal.id}`)}`,
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
    <ul ref="gridRef" class="ui-gallery-grid ui-gallery-grid--playful">
      <li
        v-for="animal in pets"
        :key="animal.id"
        class="ui-gallery-card ui-gallery-card--playful"
        :style="{ '--gallery-plate': plateForPet(animal.id) }"
      >
        <div class="ui-gallery-card-media">
          <NuxtLink :to="petPath(animal.id)" class="ui-gallery-card-media-link" :aria-label="animal.name">
            <PetAvatar :pet="animal" size="fill" />
          </NuxtLink>
        </div>
        <div class="ui-gallery-card-footer">
          <NuxtLink :to="petPath(animal.id)" class="ui-gallery-card-link">
            <div class="ui-gallery-card-body">
              <h2 class="ui-gallery-card-title">
                <span>{{ animal.name }}</span>
                <PetVirtualBadge :enabled="animal.virtualLifeEnabled" />
              </h2>
              <p class="ui-gallery-card-meta">
                {{ speciesSubtitle(animal) }}
              </p>
            </div>
          </NuxtLink>
          <div class="ui-gallery-card-actions">
            <div
              v-if="cardCaption(animal)"
              class="ui-gallery-voice-wrap"
            >
              <button
                type="button"
                class="ui-gallery-voice"
                :class="{
                  'ui-gallery-voice--open': openVoiceId === animal.id,
                  'ui-gallery-voice--new':
                    Boolean(animal.latestVoiceIsNew && (animal.latestVoice || animal.latestVoiceFr)),
                }"
                :data-voice-btn="animal.id"
                :aria-expanded="openVoiceId === animal.id"
                :aria-label="$t('gallery.greetingAria', { name: animal.name })"
                @click.stop.prevent="toggleVoice(animal.id)"
              >
                <Icon
                  :icon="UI_ACTION_ICONS.message"
                  class="ui-gallery-voice-icon"
                  aria-hidden="true"
                />
                <span
                  v-if="animal.latestVoiceIsNew && (animal.latestVoice || animal.latestVoiceFr)"
                  class="ui-gallery-voice-new"
                >
                  {{ $t('gallery.voiceNew') }}
                </span>
              </button>
            </div>
            <button
              type="button"
              class="ui-gallery-like"
              :class="{ 'ui-gallery-like--on': animal.liked }"
              :disabled="activeLikeId === animal.id || !canLike"
              :title="canLike ? undefined : $t('feed.loginToInteract')"
              @click.stop="onToggleLike(animal)"
            >
              <svg
                viewBox="0 0 24 24"
                class="ui-gallery-like-icon"
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
        </div>
      </li>
    </ul>

    <div
      v-if="openVoiceText"
      ref="balloonRef"
      class="ui-gallery-voice-balloon ui-gallery-voice-balloon--dock ui-gallery-voice-balloon--open"
      role="tooltip"
      :style="balloonStyle"
    >
      {{ openVoiceText }}
    </div>

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
