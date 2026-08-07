<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import PetAvatar from '~/components/PetAvatar.vue'
import PetCertificatesGallery from '~/components/PetCertificatesGallery.vue'
import PetMedicalEditor from '~/components/PetMedicalEditor.vue'
import PetPedigreeEditor from '~/components/PetPedigreeEditor.vue'
import PetPersonalityEditor from '~/components/PetPersonalityEditor.vue'
import PetAiDraftsPreview from '~/components/PetAiDraftsPreview.vue'
import PetFriendSuggestions from '~/components/PetFriendSuggestions.vue'
import PetVirtualBadge from '~/components/PetVirtualBadge.vue'
import PetPhotoManager from '~/components/PetPhotoManager.vue'
import { useEnumLabels } from '~/composables/useEnumLabels'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { ApiError } from '~/lib/auth-api'
import {
  deletePet,
  fetchPetBreeds,
  fetchPetSpecies,
  getPet,
  regeneratePetGreeting,
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
  middleware: ['auth', 'block-admin'],
})

const PET_EDIT_TABS = [
  'general',
  'physical',
  'pedigree',
  'certificates',
  'medical',
  'ai',
] as const

type PetEditTab = (typeof PET_EDIT_TABS)[number]

const { t, locale } = useI18n()
const localePath = useLocalePath()
const router = useRouter()
const { petSexLabel } = useEnumLabels()
const auth = useAuthStore()
const route = useRoute()

const petIdParam = computed(() => {
  const raw = route.params.id as string | undefined
  if (!raw) {
    return null
  }
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
})

const activeTab = computed<PetEditTab>(() => {
  const raw = typeof route.query.tab === 'string' ? route.query.tab : 'general'
  return (PET_EDIT_TABS as readonly string[]).includes(raw)
    ? (raw as PetEditTab)
    : 'general'
})

function setTab(tab: PetEditTab) {
  const query = { ...route.query } as Record<string, string | string[] | undefined>
  if (tab === 'general') {
    delete query.tab
  } else {
    query.tab = tab
  }
  void router.replace({ query })
}

const speciesOptions = ref<PetSpeciesListItem[]>([])
const breeds = ref<PetBreedListItem[]>([])

const name = ref('')
const speciesId = ref<number | null>(null)
const breedId = ref<number | null>(null)
const dateOfBirth = ref('')
const sex = ref<PetSex>('unknown')
const description = ref('')
const greeting = ref('')
const greetingFr = ref('')
const virtualLifeEnabled = ref(false)
const isSavingVirtualLife = ref(false)
const aiDraftsRef = ref<{ reload: () => void } | null>(null)

const weightKg = ref('')
const color = ref('')
const lengthCm = ref('')
const heightCm = ref('')
const markings = ref('')
const physicalNotes = ref('')

const localPet = ref<Pet | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const isRegeneratingGreeting = ref(false)
const isDeleting = ref(false)
const formError = ref('')
const successMessage = ref('')

const runtimeConfig = useRuntimeConfig()
const greetingRegenerateEnabled = computed(
  () => runtimeConfig.public.greetingRegenerateEnabled === true,
)

const selectedSpeciesSlug = computed(() => {
  const id = speciesId.value
  if (id === null) {
    return 'cat'
  }
  return speciesOptions.value.find((s) => s.id === id)?.slug ?? 'cat'
})

function formatOptionalNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

function parseOptionalNumber(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === '') {
    return null
  }
  const trimmed = typeof raw === 'number' ? String(raw) : String(raw).trim()
  if (!trimmed) {
    return null
  }
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) {
    throw new Error('INVALID_NUMBER')
  }
  return n
}

async function loadSpecies() {
  const { species } = await fetchPetSpecies()
  speciesOptions.value = species
}

function ensureSpeciesInOptions(species: {
  id: number
  slug: string
  label: string
}) {
  if (speciesOptions.value.some((s) => s.id === species.id)) {
    return
  }
  speciesOptions.value = [...speciesOptions.value, species].sort((a, b) =>
    a.label.localeCompare(b.label),
  )
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
  ensureSpeciesInOptions(pet.species)
  speciesId.value = pet.species.id
  await loadBreedsForSpecies(pet.species.id)
  breedId.value = pet.breed?.id ?? null
  dateOfBirth.value = pet.dateOfBirth
  sex.value = pet.sex
  description.value = pet.description ?? ''
  greeting.value = pet.greeting ?? ''
  greetingFr.value = pet.greetingFr ?? ''
  virtualLifeEnabled.value = pet.virtualLifeEnabled === true
  weightKg.value = formatOptionalNumber(pet.weightKg)
  color.value = pet.color ?? ''
  lengthCm.value = formatOptionalNumber(pet.lengthCm)
  heightCm.value = formatOptionalNumber(pet.heightCm)
  markings.value = pet.markings ?? ''
  physicalNotes.value = pet.physicalNotes ?? ''
}

async function loadEditPage(options: { soft?: boolean } = {}) {
  if (!auth.accessToken) {
    return
  }
  const soft = Boolean(options.soft && localPet.value)
  if (!soft) {
    isLoading.value = true
  }
  formError.value = ''
  try {
    if (soft) {
      const keepBreed = breedId.value
      await loadSpecies()
      if (localPet.value) {
        ensureSpeciesInOptions(localPet.value.species)
      }
      if (speciesId.value !== null) {
        await loadBreedsForSpecies(speciesId.value)
        breedId.value = keepBreed
      }
      return
    }

    await loadSpecies()
    const id = petIdParam.value
    if (!id) {
      formError.value = t('myPets.invalidPet')
      return
    }
    const { pet } = await getPet(auth.accessToken, id)
    await hydrateFromPet(pet)
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

onMounted(() => {
  void loadEditPage()
})

watch(petIdParam, (id, prevId) => {
  if (id === prevId) {
    return
  }
  localPet.value = null
  void loadEditPage()
})

watch(locale, () => {
  void loadEditPage({ soft: true })
})

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
  if (!petIdParam.value) {
    formError.value = t('myPets.invalidPet')
    return
  }

  let parsedWeight: number | null
  let parsedLength: number | null
  let parsedHeight: number | null
  try {
    parsedWeight = parseOptionalNumber(weightKg.value)
    parsedLength = parseOptionalNumber(lengthCm.value)
    parsedHeight = parseOptionalNumber(heightCm.value)
  } catch {
    formError.value = t('myPets.physicalNumberError')
    return
  }

  isSaving.value = true
  try {
    const { pet } = await updatePet(token, petIdParam.value, {
      name: trimmed,
      speciesId: speciesId.value,
      breedId: breedId.value,
      dateOfBirth: dateOfBirth.value,
      sex: sex.value,
      description: description.value.trim() || null,
      weightKg: parsedWeight,
      color: color.value.trim() || null,
      lengthCm: parsedLength,
      heightCm: parsedHeight,
      markings: markings.value.trim() || null,
      physicalNotes: physicalNotes.value.trim() || null,
    })
    await hydrateFromPet(pet)
    successMessage.value = t('myPets.saved')
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

async function regenerateGreeting() {
  const token = auth.accessToken
  if (!token || !petIdParam.value) {
    return
  }
  isRegeneratingGreeting.value = true
  formError.value = ''
  successMessage.value = ''
  try {
    // Persist General fields first so regenerate uses the latest About / name / etc.
    if (speciesId.value === null) {
      formError.value = t('myPets.chooseSpecies')
      return
    }
    const trimmed = name.value.trim()
    if (!trimmed) {
      formError.value = t('myPets.nameRequired')
      return
    }
    await updatePet(token, petIdParam.value, {
      name: trimmed,
      speciesId: speciesId.value,
      breedId: breedId.value,
      dateOfBirth: dateOfBirth.value,
      sex: sex.value,
      description: description.value.trim() || null,
    })
    const { pet } = await regeneratePetGreeting(token, petIdParam.value)
    await hydrateFromPet(pet)
    successMessage.value = t('myPets.greetingRegenerated')
  } catch (error) {
    if (error instanceof ApiError) {
      formError.value = error.message
    } else {
      formError.value = t('myPets.greetingRegenerateError')
    }
  } finally {
    isRegeneratingGreeting.value = false
  }
}

async function onVirtualLifeChange(next: boolean) {
  const token = auth.accessToken
  if (!token || !petIdParam.value) {
    return
  }
  const previous = virtualLifeEnabled.value
  virtualLifeEnabled.value = next
  isSavingVirtualLife.value = true
  formError.value = ''
  successMessage.value = ''
  try {
    const { pet } = await updatePet(token, petIdParam.value, {
      virtualLifeEnabled: next,
    })
    await hydrateFromPet(pet)
    successMessage.value = next
      ? t('myPets.virtualLife.savedOn')
      : t('myPets.virtualLife.savedOff')
    if (next) {
      aiDraftsRef.value?.reload()
    }
  } catch (error) {
    virtualLifeEnabled.value = previous
    if (error instanceof ApiError) {
      formError.value = error.message
    } else {
      formError.value = t('myPets.virtualLife.saveError')
    }
  } finally {
    isSavingVirtualLife.value = false
  }
}

async function confirmDelete() {
  if (!petIdParam.value || !auth.accessToken) {
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

    <h1 class="ui-page-title flex flex-wrap items-center gap-2">
      <span>{{ $t('myPets.editTitle') }}</span>
      <PetVirtualBadge :enabled="virtualLifeEnabled" />
    </h1>

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

    <template v-if="!isLoading">
      <nav class="ui-tabs mt-6" :aria-label="$t('myPets.editTitle')">
        <button
          v-for="tab in PET_EDIT_TABS"
          :key="tab"
          type="button"
          class="ui-tab"
          :class="{ 'ui-tab-active': activeTab === tab }"
          @click="setTab(tab)"
        >
          {{ $t(`myPets.tabs.${tab}`) }}
        </button>
      </nav>

      <form
        v-show="activeTab === 'general'"
        class="ui-card ui-form-stack mt-2"
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

        <div>
          <label class="ui-field">
            {{ $t('myPets.greetingEn') }}
            <textarea
              :value="greeting"
              class="ui-textarea bg-(--ui-surface-inset)"
              rows="3"
              readonly
            />
          </label>
          <label class="ui-field mt-3">
            {{ $t('myPets.greetingFr') }}
            <textarea
              :value="greetingFr"
              class="ui-textarea bg-(--ui-surface-inset)"
              rows="3"
              readonly
            />
          </label>
          <p class="ui-hint mt-1">{{ $t('myPets.greetingHint') }}</p>
          <button
            v-if="greetingRegenerateEnabled"
            type="button"
            class="ui-btn-secondary ui-btn-sm mt-2"
            :disabled="isRegeneratingGreeting || isSaving || isLoading"
            @click="regenerateGreeting"
          >
            {{
              isRegeneratingGreeting
                ? $t('common.saving')
                : $t('myPets.regenerateGreeting')
            }}
          </button>
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
        v-if="activeTab === 'general' && petIdParam"
        :pet-id="petIdParam"
        :species-slug="selectedSpeciesSlug"
        @pet-updated="onPetUpdated"
      />

      <form
        v-show="activeTab === 'physical'"
        class="ui-card ui-form-stack mt-2"
        @submit.prevent="savePet"
      >
        <p class="ui-page-subtitle">{{ $t('myPets.physicalHint') }}</p>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="ui-field">
            {{ $t('myPets.weightKg') }}
            <input
              v-model="weightKg"
              type="number"
              min="0"
              step="0.001"
              class="ui-input"
              inputmode="decimal"
            />
          </label>
          <label class="ui-field">
            {{ $t('myPets.color') }}
            <input
              v-model="color"
              type="text"
              maxlength="120"
              class="ui-input"
            />
          </label>
          <label class="ui-field">
            {{ $t('myPets.lengthCm') }}
            <input
              v-model="lengthCm"
              type="number"
              min="0"
              step="0.01"
              class="ui-input"
              inputmode="decimal"
            />
          </label>
          <label class="ui-field">
            {{ $t('myPets.heightCm') }}
            <input
              v-model="heightCm"
              type="number"
              min="0"
              step="0.01"
              class="ui-input"
              inputmode="decimal"
            />
          </label>
        </div>

        <label class="ui-field">
          {{ $t('myPets.markings') }}
          <input
            v-model="markings"
            type="text"
            maxlength="500"
            class="ui-input"
          />
        </label>

        <label class="ui-field">
          {{ $t('myPets.physicalNotes') }}
          <textarea
            v-model="physicalNotes"
            class="ui-textarea"
            rows="3"
            maxlength="2000"
            :placeholder="$t('myPets.physicalNotesPlaceholder')"
          />
        </label>

        <div class="ui-form-actions">
          <button
            type="submit"
            class="ui-btn-primary ui-btn-md"
            :disabled="isSaving || isLoading"
          >
            {{ isSaving ? $t('common.saving') : $t('common.save') }}
          </button>
        </div>
      </form>

      <PetPedigreeEditor
        v-if="activeTab === 'pedigree' && petIdParam"
        class="mt-2"
        :pet-id="petIdParam"
      />

      <PetCertificatesGallery
        v-if="activeTab === 'certificates' && petIdParam"
        :pet-id="petIdParam"
      />

      <PetMedicalEditor
        v-if="activeTab === 'medical' && petIdParam"
        :pet-id="petIdParam"
      />

      <div
        v-if="activeTab === 'ai' && petIdParam"
        class="mt-2 space-y-6"
      >
        <p class="ui-hint">{{ $t('myPets.tabAiHint') }}</p>

        <div class="ui-card space-y-3 p-4">
          <h2 class="text-base font-semibold">{{ $t('myPets.virtualLife.title') }}</h2>
          <p class="ui-hint">{{ $t('myPets.virtualLife.hint') }}</p>
          <label class="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              class="mt-1 size-4 accent-(--ui-accent)"
              :checked="virtualLifeEnabled"
              :disabled="isSavingVirtualLife || isLoading"
              @change="onVirtualLifeChange(($event.target as HTMLInputElement).checked)"
            />
            <span>
              {{
                virtualLifeEnabled
                  ? $t('myPets.virtualLife.enabled')
                  : $t('myPets.virtualLife.disabled')
              }}
            </span>
          </label>
        </div>

        <PetPersonalityEditor
          :pet-id="petIdParam"
        />

        <PetFriendSuggestions
          :pet-id="petIdParam"
          :virtual-life-enabled="virtualLifeEnabled"
        />

        <PetAiDraftsPreview
          ref="aiDraftsRef"
          :pet-id="petIdParam"
          :virtual-life-enabled="virtualLifeEnabled"
        />
      </div>
    </template>
  </section>
</template>
