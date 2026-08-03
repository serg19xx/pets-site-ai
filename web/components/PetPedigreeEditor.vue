<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import { ApiError } from '~/lib/auth-api'
import { validateImageFile } from '~/lib/image-export'
import {
  deleteExternalParentPhoto,
  getPetParents,
  listMyPets,
  searchParentCandidates,
  setPetParents,
  updatePet,
  uploadExternalParentPhoto,
} from '~/lib/pets-api'
import { useAuthStore } from '~/stores/auth'
import type {
  ParentCandidate,
  PetParentRecord,
  PetParentRole,
  PetParentSource,
  UpsertPetParentInput,
} from '~/types/pet-parent'
import type { Pet } from '~/types/pet'

type SourceChoice = 'none' | PetParentSource

interface ParentDraft {
  source: SourceChoice
  linkedPetId: number | null
  linkedLabel: string
  name: string
  breedLabel: string
  notes: string
  photoUrl: string | null
}

const props = defineProps<{
  petId: number
}>()

const { t } = useI18n()
const auth = useAuthStore()

const isLoading = ref(true)
const isSaving = ref(false)
const isUploadingPhoto = ref<'dam' | 'sire' | null>(null)
const errorMessage = ref('')
const successMessage = ref('')

const ownedPets = ref<Pet[]>([])
const childSpeciesId = ref<number | null>(null)
const childSpeciesLabel = ref('')
const pedigreeNotes = ref('')
const dam = ref<ParentDraft>(emptyDraft())
const sire = ref<ParentDraft>(emptyDraft())

const siteQuery = ref<{ dam: string; sire: string }>({ dam: '', sire: '' })
const siteResults = ref<{ dam: ParentCandidate[]; sire: ParentCandidate[] }>({
  dam: [],
  sire: [],
})
const siteSearching = ref<{ dam: boolean; sire: boolean }>({ dam: false, sire: false })
let siteSearchTimers: { dam: ReturnType<typeof setTimeout> | null; sire: ReturnType<typeof setTimeout> | null } = {
  dam: null,
  sire: null,
}

const otherOwnedPets = computed(() =>
  ownedPets.value.filter(
    (pet) =>
      pet.id !== props.petId &&
      (childSpeciesId.value === null || pet.species.id === childSpeciesId.value),
  ),
)

const panels = computed(() => [
  { role: 'dam' as const, draft: dam.value, titleKey: 'myPets.pedigree.dam' },
  { role: 'sire' as const, draft: sire.value, titleKey: 'myPets.pedigree.sire' },
])

function emptyDraft(): ParentDraft {
  return {
    source: 'none',
    linkedPetId: null,
    linkedLabel: '',
    name: '',
    breedLabel: '',
    notes: '',
    photoUrl: null,
  }
}

function recordToDraft(record: PetParentRecord | null): ParentDraft {
  if (!record) {
    return emptyDraft()
  }
  if (record.source === 'external') {
    return {
      source: 'external',
      linkedPetId: null,
      linkedLabel: '',
      name: record.name ?? '',
      breedLabel: record.breedLabel ?? '',
      notes: record.notes ?? '',
      photoUrl: record.photoUrl,
    }
  }
  const linked = record.linkedPet
  return {
    source: record.source,
    linkedPetId: linked?.id ?? null,
    linkedLabel: linked
      ? `${linked.name} · ${linked.speciesLabel}`
      : '',
    name: '',
    breedLabel: '',
    notes: '',
    photoUrl: null,
  }
}

function applyParents(result: {
  dam: PetParentRecord | null
  sire: PetParentRecord | null
}) {
  dam.value = recordToDraft(result.dam)
  sire.value = recordToDraft(result.sire)
}

function draftFor(role: PetParentRole): ParentDraft {
  return role === 'dam' ? dam.value : sire.value
}

function onSourceChange(role: PetParentRole) {
  const draft = draftFor(role)
  draft.linkedPetId = null
  draft.linkedLabel = ''
  draft.name = ''
  draft.breedLabel = ''
  draft.notes = ''
  draft.photoUrl = null
  siteQuery.value[role] = ''
  siteResults.value[role] = []
}

function selectOwnedPet(role: PetParentRole, petId: number | null) {
  const draft = draftFor(role)
  draft.linkedPetId = petId
  const pet = otherOwnedPets.value.find((p) => p.id === petId)
  draft.linkedLabel = pet
    ? `${pet.name} · ${pet.species.label}`
    : ''
}

function selectSitePet(role: PetParentRole, candidate: ParentCandidate) {
  const draft = draftFor(role)
  draft.linkedPetId = candidate.id
  draft.linkedLabel = `${candidate.name} · ${candidate.speciesLabel}`
  // Keep UI on site search; backend coerces own pets to owned_pet on save.
  siteQuery.value[role] = ''
  siteResults.value[role] = []
}

function clearSiteSelection(role: PetParentRole) {
  const draft = draftFor(role)
  draft.linkedPetId = null
  draft.linkedLabel = ''
}

function scheduleSiteSearch(role: PetParentRole) {
  const existing = siteSearchTimers[role]
  if (existing) {
    clearTimeout(existing)
  }
  siteSearchTimers[role] = setTimeout(() => {
    void runSiteSearch(role)
  }, 300)
}

async function runSiteSearch(role: PetParentRole) {
  const token = auth.accessToken
  const q = siteQuery.value[role].trim()
  if (!token || q.length < 1) {
    siteResults.value[role] = []
    return
  }
  siteSearching.value[role] = true
  try {
    const result = await searchParentCandidates(token, {
      q,
      excludePetId: props.petId,
      limit: 10,
    })
    siteResults.value[role] = result.site
  } catch {
    siteResults.value[role] = []
  } finally {
    siteSearching.value[role] = false
  }
}

function buildUpsert(draft: ParentDraft): UpsertPetParentInput | null {
  if (draft.source === 'none') {
    return null
  }
  if (draft.source === 'external') {
    return {
      source: 'external',
      name: draft.name.trim(),
      breedLabel: draft.breedLabel.trim() || null,
      notes: draft.notes.trim() || null,
    }
  }
  return {
    source: draft.source,
    linkedPetId: draft.linkedPetId,
  }
}

async function loadAll() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [parents, petsResult] = await Promise.all([
      getPetParents(token, props.petId),
      listMyPets(token),
    ])
    ownedPets.value = petsResult.pets
    const child = petsResult.pets.find((pet) => pet.id === props.petId)
    childSpeciesId.value = child?.species.id ?? null
    childSpeciesLabel.value = child?.species.label ?? ''
    pedigreeNotes.value = child?.pedigreeNotes ?? ''
    applyParents(parents)
  } catch (error) {
    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = t('myPets.pedigree.loadError')
    }
  } finally {
    isLoading.value = false
  }
}

async function saveParents() {
  const token = auth.accessToken
  if (!token) {
    return
  }

  for (const role of ['dam', 'sire'] as const) {
    const draft = draftFor(role)
    if (draft.source === 'owned_pet' || draft.source === 'site_pet') {
      if (!draft.linkedPetId) {
        errorMessage.value = t('myPets.pedigree.pickPetRequired')
        return
      }
    }
    if (draft.source === 'external' && draft.name.trim().length < 1) {
      errorMessage.value = t('myPets.pedigree.externalNameRequired')
      return
    }
  }

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const [result] = await Promise.all([
      setPetParents(token, props.petId, {
        dam: buildUpsert(dam.value),
        sire: buildUpsert(sire.value),
      }),
      updatePet(token, props.petId, {
        pedigreeNotes: pedigreeNotes.value.trim() || null,
      }),
    ])
    applyParents(result)
    successMessage.value = t('myPets.pedigree.saved')
  } catch (error) {
    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = t('myPets.pedigree.saveError')
    }
  } finally {
    isSaving.value = false
  }
}

async function onPhotoSelected(role: PetParentRole, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }
  const token = auth.accessToken
  if (!token) {
    return
  }

  const validationError = validateImageFile(file)
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  // External parent row must exist before photo upload.
  if (draftFor(role).source === 'external') {
    const name = draftFor(role).name.trim()
    if (!name) {
      errorMessage.value = t('myPets.pedigree.externalNameRequired')
      return
    }
    isUploadingPhoto.value = role
    errorMessage.value = ''
    successMessage.value = ''
    try {
      await setPetParents(token, props.petId, {
        [role]: {
          source: 'external' as const,
          name,
          breedLabel: draftFor(role).breedLabel.trim() || null,
          notes: draftFor(role).notes.trim() || null,
        },
      })
      const { parent } = await uploadExternalParentPhoto(token, props.petId, role, file)
      if (role === 'dam') {
        dam.value = recordToDraft(parent)
      } else {
        sire.value = recordToDraft(parent)
      }
      successMessage.value = t('myPets.pedigree.photoUpdated')
    } catch (error) {
      if (error instanceof ApiError) {
        errorMessage.value = error.message
      } else {
        errorMessage.value = t('myPets.pedigree.photoError')
      }
    } finally {
      isUploadingPhoto.value = null
    }
  }
}

async function removePhoto(role: PetParentRole) {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isUploadingPhoto.value = role
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const { parent } = await deleteExternalParentPhoto(token, props.petId, role)
    if (role === 'dam') {
      dam.value = recordToDraft(parent)
    } else {
      sire.value = recordToDraft(parent)
    }
    successMessage.value = t('myPets.pedigree.photoRemoved')
  } catch (error) {
    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = t('myPets.pedigree.photoRemoveError')
    }
  } finally {
    isUploadingPhoto.value = null
  }
}

onMounted(() => {
  void loadAll()
})

watch(
  () => props.petId,
  () => {
    void loadAll()
  },
)
</script>

<template>
  <div class="mt-2 space-y-4">
    <p class="ui-hint">{{ $t('myPets.tabPedigreeHint') }}</p>

    <p
      v-if="errorMessage"
      class="ui-alert-error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="successMessage"
      class="ui-alert-success"
    >
      {{ successMessage }}
    </p>

    <p v-if="isLoading" class="ui-hint">{{ $t('common.loading') }}</p>

    <template v-else>
      <div
        v-for="panel in panels"
        :key="panel.role"
        class="ui-card ui-form-stack p-4"
      >
        <h2 class="text-base font-semibold">{{ $t(panel.titleKey) }}</h2>

        <label class="ui-field">
          {{ $t('myPets.pedigree.source') }}
          <select
            v-model="panel.draft.source"
            class="ui-select"
            @change="onSourceChange(panel.role)"
          >
            <option value="none">{{ $t('myPets.pedigree.sourceNone') }}</option>
            <option value="owned_pet">{{ $t('myPets.pedigree.sourceOwned') }}</option>
            <option value="site_pet">{{ $t('myPets.pedigree.sourceSite') }}</option>
            <option value="external">{{ $t('myPets.pedigree.sourceExternal') }}</option>
          </select>
        </label>

        <template v-if="panel.draft.source === 'owned_pet'">
          <label class="ui-field">
            {{ $t('myPets.pedigree.pickOwned') }}
            <select
              class="ui-select"
              :value="panel.draft.linkedPetId ?? ''"
              @change="
                selectOwnedPet(
                  panel.role,
                  ($event.target as HTMLSelectElement).value
                    ? Number(($event.target as HTMLSelectElement).value)
                    : null,
                )
              "
            >
              <option value="">{{ $t('myPets.pedigree.pickPlaceholder') }}</option>
              <option
                v-for="pet in otherOwnedPets"
                :key="pet.id"
                :value="pet.id"
              >
                {{ pet.name }} · {{ pet.species.label }}
              </option>
            </select>
          </label>
          <p v-if="otherOwnedPets.length === 0" class="ui-hint">
            {{
              childSpeciesLabel
                ? $t('myPets.pedigree.noOtherPetsSameSpecies', {
                    species: childSpeciesLabel,
                  })
                : $t('myPets.pedigree.noOtherPets')
            }}
          </p>
        </template>

        <template v-else-if="panel.draft.source === 'site_pet'">
          <div v-if="panel.draft.linkedPetId" class="space-y-2">
            <p class="text-sm">
              {{ panel.draft.linkedLabel }}
            </p>
            <button
              type="button"
              class="ui-btn-secondary ui-btn-sm"
              @click="clearSiteSelection(panel.role)"
            >
              {{ $t('myPets.pedigree.clearSelection') }}
            </button>
          </div>
          <template v-else>
            <label class="ui-field">
              {{ $t('myPets.pedigree.searchSite') }}
              <input
                v-model="siteQuery[panel.role]"
                type="search"
                class="ui-input"
                autocomplete="off"
                :placeholder="$t('myPets.pedigree.searchPlaceholder')"
                @input="scheduleSiteSearch(panel.role)"
              />
            </label>
            <p v-if="childSpeciesLabel" class="ui-hint">
              {{ $t('myPets.pedigree.sameSpeciesHint', { species: childSpeciesLabel }) }}
            </p>
            <p v-if="siteSearching[panel.role]" class="ui-hint">
              {{ $t('common.loading') }}
            </p>
            <ul
              v-else-if="siteResults[panel.role].length > 0"
              class="divide-y divide-(--ui-border) rounded border border-(--ui-border)"
            >
              <li
                v-for="candidate in siteResults[panel.role]"
                :key="candidate.id"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-(--ui-surface-muted)"
                  @click="selectSitePet(panel.role, candidate)"
                >
                  <img
                    v-if="candidate.avatarUrl"
                    :src="candidate.avatarUrl"
                    alt=""
                    class="size-8 rounded-full object-cover"
                  />
                  <span
                    v-else
                    class="flex size-8 items-center justify-center rounded-full bg-(--ui-surface-muted) text-xs"
                  >
                    —
                  </span>
                  <span>
                    {{ candidate.name }}
                    <span class="ui-hint"> · {{ candidate.speciesLabel }}</span>
                  </span>
                </button>
              </li>
            </ul>
            <p
              v-else-if="siteQuery[panel.role].trim().length > 0"
              class="ui-hint"
            >
              {{ $t('myPets.pedigree.noSearchResults') }}
            </p>
          </template>
        </template>

        <template v-else-if="panel.draft.source === 'external'">
          <label class="ui-field">
            {{ $t('myPets.pedigree.externalName') }}
            <input
              v-model="panel.draft.name"
              type="text"
              maxlength="200"
              class="ui-input"
              required
            />
          </label>
          <label class="ui-field">
            {{ $t('myPets.pedigree.externalBreed') }}
            <input
              v-model="panel.draft.breedLabel"
              type="text"
              maxlength="200"
              class="ui-input"
            />
          </label>
          <label class="ui-field">
            {{ $t('myPets.pedigree.externalNotes') }}
            <textarea
              v-model="panel.draft.notes"
              class="ui-textarea"
              rows="2"
              maxlength="2000"
            />
          </label>

          <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('myPets.pedigree.photo') }}</p>
            <div v-if="panel.draft.photoUrl" class="flex items-center gap-3">
              <img
                :src="panel.draft.photoUrl"
                alt=""
                class="size-16 rounded object-cover"
              />
              <button
                type="button"
                class="ui-btn-secondary ui-btn-sm"
                :disabled="isUploadingPhoto === panel.role"
                @click="removePhoto(panel.role)"
              >
                {{ $t('myPets.pedigree.removePhoto') }}
              </button>
            </div>
            <label class="ui-btn-secondary ui-btn-sm inline-flex cursor-pointer">
              {{
                isUploadingPhoto === panel.role
                  ? $t('common.saving')
                  : $t('myPets.pedigree.uploadPhoto')
              }}
              <input
                type="file"
                class="sr-only"
                accept="image/jpeg,image/png,image/webp,image/gif"
                :disabled="isUploadingPhoto === panel.role"
                @change="onPhotoSelected(panel.role, $event)"
              />
            </label>
            <p class="ui-hint">{{ $t('myPets.pedigree.photoHint') }}</p>
          </div>
        </template>
      </div>

      <div class="ui-card ui-form-stack p-4">
        <label class="ui-field">
          {{ $t('myPets.pedigree.notes') }}
          <textarea
            v-model="pedigreeNotes"
            class="ui-textarea"
            rows="4"
            maxlength="2000"
            :placeholder="$t('myPets.pedigree.notesPlaceholder')"
          />
        </label>
        <p class="ui-hint">{{ $t('myPets.pedigree.notesHint') }}</p>
      </div>

      <div class="ui-form-actions">
        <button
          type="button"
          class="ui-btn-primary ui-btn-md"
          :disabled="isSaving || isLoading"
          @click="saveParents"
        >
          {{ isSaving ? $t('common.saving') : $t('myPets.pedigree.save') }}
        </button>
      </div>
    </template>
  </div>
</template>
