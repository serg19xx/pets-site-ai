<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import PetAvatar from '~/components/PetAvatar.vue'
import PetPhotoManager from '~/components/PetPhotoManager.vue'
import { useEnumLabels } from '~/composables/useEnumLabels'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { ApiError } from '~/lib/auth-api'
import {
  createPet,
  deletePet,
  fetchPetBreeds,
  fetchPetSpecies,
  getPet,
  updatePet,
} from '~/lib/pets-api'
import { useAuthStore } from '~/stores/auth'
import {
  PET_SEXES,
  type Pet,
  type PetBreedListItem,
  type PetSex,
  type PetSpeciesListItem,
} from '~/types/pet'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const { petSexLabel } = useEnumLabels()
const auth = useAuthStore()
const route = useRoute()

const isNew = computed(() => false)
const petIdParam = computed(() => {
  const raw = route.params.id as string | undefined
  if (!raw) {
    return null
  }
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
})

const speciesOptions = ref<PetSpeciesListItem[]>([])
const breeds = ref<PetBreedListItem[]>([])

const name = ref('')
const speciesId = ref<number | null>(null)
const breedId = ref<number | null>(null)
const dateOfBirth = ref('')
const sex = ref<PetSex>('unknown')
const description = ref('')
const greeting = ref('')

const localPet = ref<Pet | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const isDeleting = ref(false)
const formError = ref('')
const successMessage = ref('')

const selectedSpeciesSlug = computed(() => {
  const id = speciesId.value
  if (id === null) {
    return 'cat'
  }
  return speciesOptions.value.find((s) => s.id === id)?.slug ?? 'cat'
})

async function loadSpecies() {
  const { species } = await fetchPetSpecies()
  speciesOptions.value = species
}

async function loadBreedsForSpecies(sid: number | null) {
  if (!sid) {
    breeds.value = []
    return
  }
  try {
    const { breeds: list } = await fetchPetBreeds(sid)
    breeds.value = list
  } catch {
    breeds.value = []
  }
}

async function onSpeciesChange() {
  breedId.value = null
  if (speciesId.value !== null) {
    await loadBreedsForSpecies(speciesId.value)
  }
}

async function hydrateFromPet(pet: Pet) {
  localPet.value = pet
  name.value = pet.name
  speciesId.value = pet.species.id
  await loadBreedsForSpecies(pet.species.id)
  breedId.value = pet.breed?.id ?? null
  dateOfBirth.value = pet.dateOfBirth
  sex.value = pet.sex
  description.value = pet.description ?? ''
  greeting.value = pet.greeting ?? ''
}

async function loadEditPage() {
  if (!auth.accessToken) {
    return
  }
  isLoading.value = true
  formError.value = ''
  try {
    await loadSpecies()
    if (isNew.value) {
      name.value = ''
      breedId.value = null
      dateOfBirth.value = ''
      sex.value = 'unknown'
      localPet.value = null
      const first = speciesOptions.value[0]
      speciesId.value = first?.id ?? null
      if (speciesId.value !== null) {
        await loadBreedsForSpecies(speciesId.value)
      }
    } else {
      const id = petIdParam.value
      if (!id) {
        formError.value = t('myPets.invalidPet')
        return
      }
      const { pet } = await getPet(auth.accessToken, id)
      await hydrateFromPet(pet)
    }
  } catch (error) {
    if (error instanceof ApiError) {
      formError.value = error.message
    } else {
      formError.value = t('myPets.loadDataError')
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(loadEditPage)

watch(() => route.fullPath, loadEditPage)

async function savePet() {
  formError.value = ''
  successMessage.value = ''
  const token = auth.accessToken
  if (!token) {
    formError.value = t('auth.notSignedIn')
    return
  }
  if (speciesId.value === null) {
    formError.value = t('myPets.chooseSpecies')
    return
  }
  const trimmed = name.value.trim()
  if (!trimmed) {
    formError.value = t('myPets.nameRequired')
    return
  }

  isSaving.value = true
  try {
    if (isNew.value) {
      const { pet } = await createPet(token, {
        name: trimmed,
        speciesId: speciesId.value,
        breedId: breedId.value,
        dateOfBirth: dateOfBirth.value,
        sex: sex.value,
        description: description.value.trim() || null,
      })
      await navigateTo(localePath(`/app/my-pets/${pet.id}`))
      await hydrateFromPet(pet)
      successMessage.value = t('myPets.created')
    } else if (petIdParam.value) {
      const { pet } = await updatePet(token, petIdParam.value, {
        name: trimmed,
        speciesId: speciesId.value,
        breedId: breedId.value,
        dateOfBirth: dateOfBirth.value,
        sex: sex.value,
        description: description.value.trim() || null,
      })
      await hydrateFromPet(pet)
      successMessage.value = t('myPets.saved')
    }
  } catch (error) {
    if (error instanceof ApiError) {
      formError.value = error.message
    } else {
      formError.value = t('common.saveError')
    }
  } finally {
    isSaving.value = false
  }
}

function onPetUpdated(pet: Pet) {
  void hydrateFromPet(pet)
}

async function confirmDelete() {
  if (isNew.value || !petIdParam.value || !auth.accessToken) {
    return
  }
  if (!window.confirm(t('myPets.deleteConfirm'))) {
    return
  }
  isDeleting.value = true
  formError.value = ''
  try {
    await deletePet(auth.accessToken, petIdParam.value)
    await navigateTo(localePath('/app/my-pets'))
  } catch (error) {
    if (error instanceof ApiError) {
      formError.value = error.message
    } else {
      formError.value = t('myPets.deleteError')
    }
  } finally {
    isDeleting.value = false
  }
}

</script>

<template>
  <section class="ui-page-container">
    <div class="mb-4">
      <NuxtLink
        :to="localePath('/app/my-pets')"
        class="ui-link-back mb-0! inline-flex"
      >
        <Icon :icon="UI_ACTION_ICONS.back" class="ui-icon-sm" aria-hidden="true" />
        {{ $t('myPets.backToList') }}
      </NuxtLink>
    </div>

    <h1 class="ui-page-title">
      {{ isNew ? $t('myPets.addTitle') : $t('myPets.editTitle') }}
    </h1>
    <p v-if="isNew" class="ui-page-subtitle mt-2">
      {{ $t('myPets.addHint') }}
    </p>

    <div v-if="isNew" class="mt-4 flex justify-center">
      <PetAvatar :species-slug="selectedSpeciesSlug" size="lg" />
    </div>

    <p v-if="isLoading" class="ui-page-subtitle mt-2">{{ $t('common.loading') }}</p>

    <p
      v-if="formError"
      class="ui-alert-error mt-4"
      role="alert"
    >
      {{ formError }}
    </p>
    <p
      v-if="successMessage"
      class="ui-alert-success mt-4"
    >
      {{ successMessage }}
    </p>

    <form
      v-if="!isLoading"
      class="ui-card ui-form-stack mt-6"
      @submit.prevent="savePet"
    >

      <div>
        <label class="ui-field">
          {{ $t('myPets.name') }}
          <input
            v-model="name"
            type="text"
            required
            maxlength="200"
            class="ui-input"
          />
        </label>
      </div>

      <div>
        <label class="ui-field">
          {{ $t('myPets.species') }}
          <select
            v-model.number="speciesId"
            required
            class="ui-select"
            @change="onSpeciesChange"
          >
            <option v-if="speciesId === null" disabled value="">
              {{ $t('myPets.selectSpecies') }}
            </option>
            <option v-for="s in speciesOptions" :key="s.id" :value="s.id">
              {{ s.label }}
            </option>
          </select>
        </label>
      </div>

      <div>
        <label class="ui-field">
          {{ $t('myPets.breed') }}
          <select
            v-model="breedId"
            class="ui-select"
            :disabled="breeds.length === 0"
          >
            <option :value="null">{{ $t('myPets.notSpecified') }}</option>
            <option v-for="b in breeds" :key="b.id" :value="b.id">
              {{ b.label }}
            </option>
          </select>
        </label>
        <p v-if="speciesId !== null && breeds.length === 0" class="ui-hint mt-1">
          {{ $t('myPets.noBreeds') }}
        </p>
      </div>

      <div>
        <label class="ui-label-spaced" for="pet-edit-date-of-birth">
          {{ $t('profile.dateOfBirth') }}
        </label>
        <input
          id="pet-edit-date-of-birth"
          v-model="dateOfBirth"
          type="date"
          required
          class="ui-input"
        />
      </div>

      <div>
        <label class="ui-field">
          {{ $t('myPets.sex') }}
          <select
            v-model="sex"
            class="ui-select"
          >
            <option v-for="s in PET_SEXES" :key="s" :value="s">
              {{ petSexLabel(s) }}
            </option>
          </select>
        </label>
      </div>

      <div>
        <label class="ui-field">
          {{ $t('myPets.description') }}
          <textarea
            v-model="description"
            class="ui-textarea"
            rows="4"
            maxlength="2000"
            :placeholder="$t('myPets.descriptionPlaceholder')"
          />
        </label>
        <p class="ui-hint mt-1">{{ $t('myPets.descriptionHint') }}</p>
      </div>

      <div v-if="!isNew">
        <label class="ui-field">
          {{ $t('myPets.greeting') }}
          <textarea
            :model-value="greeting"
            class="ui-textarea bg-(--ui-surface-inset)"
            rows="3"
            readonly
          />
        </label>
        <p class="ui-hint mt-1">{{ $t('myPets.greetingHint') }}</p>
      </div>

      <div class="ui-form-actions">
        <button
          type="submit"
          class="ui-btn-primary ui-btn-md"
          :disabled="isSaving || isLoading"
        >
          {{ isSaving ? $t('common.saving') : $t('common.save') }}
        </button>
        <button
          v-if="!isNew"
          type="button"
          class="ui-btn-danger ui-btn-md"
          :disabled="isDeleting"
          @click="confirmDelete"
        >
          {{ isDeleting ? $t('myPets.deleting') : $t('myPets.deletePet') }}
        </button>
      </div>
    </form>

    <PetPhotoManager
      v-if="!isNew && petIdParam"
      :pet-id="petIdParam"
      :species-slug="selectedSpeciesSlug"
      @pet-updated="onPetUpdated"
    />
  </section>
</template>
