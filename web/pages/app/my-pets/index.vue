<script setup lang="ts">
import { onMounted, ref } from 'vue'

import PetAvatar from '~/components/PetAvatar.vue'
import { ApiError } from '~/lib/auth-api'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { listMyPets } from '~/lib/pets-api'
import { useAuthStore } from '~/stores/auth'
import type { Pet } from '~/types/pet'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()

const pets = ref<Pet[]>([])
const isLoading = ref(true)
const loadError = ref('')

async function loadPets() {
  if (!auth.accessToken) {
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const { pets: list } = await listMyPets(auth.accessToken)
    pets.value = list
  } catch (error) {
    if (error instanceof ApiError) {
      loadError.value = error.message
    } else {
      loadError.value = t('myPets.loadError')
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadPets()
})

function speciesLine(pet: Pet) {
  const b = pet.breed?.label
  return b ? `${pet.species.label} · ${b}` : pet.species.label
}
</script>

<template>
  <section class="ui-page-container">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="ui-page-title">{{ $t('myPets.title') }}</h1>
      <NuxtLink
        v-if="auth.accessToken"
        :to="localePath('/app/my-pets/new')"
        class="ui-btn-primary ui-btn-sm"
      >
        {{ $t('myPets.addPet') }}
      </NuxtLink>
    </div>

    <p class="ui-page-subtitle mt-2">
      {{ $t('myPets.subtitle') }}
    </p>

    <p v-if="isLoading" class="ui-loading mt-6">{{ $t('common.loading') }}</p>
    <p
      v-else-if="loadError"
      class="ui-alert-error mt-6"
    >
      {{ loadError }}
    </p>

    <div
      v-else-if="pets.length === 0"
      class="ui-empty mt-8 py-12"
    >
      <p class="ui-empty-title">{{ $t('myPets.emptyTitle') }}</p>
      <p class="ui-empty-text">
        <template v-if="auth.user">
          {{ $t('myPets.emptyHint', { name: auth.displayName }) }}
        </template>
        <template v-else>
          {{ $t('myPets.emptyHintAnonymous') }}
        </template>
      </p>
      <NuxtLink
        :to="localePath('/app/my-pets/new')"
        class="ui-btn-primary ui-btn-md mt-6 inline-block"
      >
        {{ $t('myPets.addFirst') }}
      </NuxtLink>
    </div>

    <ul v-else class="ui-list-spaced mt-6">
      <li v-for="pet in pets" :key="pet.id">
        <NuxtLink
          :to="localePath(`/app/my-pets/${pet.id}`)"
          class="ui-list-link"
        >
          <PetAvatar :pet="pet" size="md" />
          <div class="min-w-0 flex-1">
            <p class="ui-list-link-title">{{ pet.name }}</p>
            <p class="ui-list-link-meta">
              {{ speciesLine(pet) }}
            </p>
          </div>
          <Icon :icon="UI_ACTION_ICONS.chevron" class="ui-icon-md ui-chevron" aria-hidden="true" />
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
