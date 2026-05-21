<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import PetAvatar from '~/components/PetAvatar.vue'
import { ApiError } from '~/lib/auth-api'
import { fetchGalleryPets } from '~/lib/pets-api'
import type { GalleryPet } from '~/types/gallery'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const siteUrl = (config.public.siteUrl as string) || ''

const PAGE_SIZE = 24

const extraPets = ref<GalleryPet[]>([])
const isLoadingMore = ref(false)
const loadMoreError = ref('')

const { data, pending, error } = await useAsyncData(
  () => `gallery-home-${locale.value}`,
  () => fetchGalleryPets({ limit: PAGE_SIZE, offset: 0 }),
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
      </li>
    </ul>

    <p v-if="loadError" class="ui-alert-error mt-4" role="alert">
      {{ loadError }}
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
