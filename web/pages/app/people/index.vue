<script setup lang="ts">
import MemberFriendActions from '~/components/MemberFriendActions.vue'
import PetAvatar from '~/components/PetAvatar.vue'
import UserAvatar from '~/components/UserAvatar.vue'
import { ApiError } from '~/lib/auth-api'
import {
  searchMembers,
  type MemberSearchHit,
} from '~/lib/members-api'
import { fetchPetBreeds, fetchPetSpecies, listMyPets } from '~/lib/pets-api'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { useAuthStore } from '~/stores/auth'
import type { Pet, PetBreedListItem, PetSpeciesListItem } from '~/types/pet'
import { USER_GENDERS, type UserGender } from '~/types/user'
import { useEnumLabels } from '~/composables/useEnumLabels'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()
const { genderLabel } = useEnumLabels()

const PAGE_SIZE = 24
const MAX_PET_SETS = 5

interface PetFilterSetRow {
  key: string
  speciesSlug: string
  breedLabel: string
  petSex: 'male' | 'female' | 'unknown' | ''
  breedList: PetBreedListItem[]
}

const nameQuery = ref(
  typeof route.query.q === 'string' ? route.query.q.slice(0, 80) : '',
)
const gender = ref<UserGender | ''>('')
const ageMin = ref<number | null>(null)
const ageMax = ref<number | null>(null)
const city = ref('')
const friendsOnly = ref(route.query.friends === '1' || route.query.friends === 'true')
const petSets = ref<PetFilterSetRow[]>([createEmptySet()])

const speciesList = ref<PetSpeciesListItem[]>([])
const myPets = ref<Pet[]>([])
const presetPetId = ref<number | null>(null)

const results = ref<MemberSearchHit[]>([])
const total = ref(0)
const isLoading = ref(false)
const loadError = ref('')

function createEmptySet(): PetFilterSetRow {
  return {
    key: `set-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    speciesSlug: '',
    breedLabel: '',
    petSex: '',
    breedList: [],
  }
}

function memberInitial(name: string) {
  const trimmed = name.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

function memberMeta(hit: MemberSearchHit) {
  const bits: string[] = []
  if (hit.member.city) {
    bits.push(hit.member.city)
  }
  if (hit.member.gender) {
    bits.push(genderLabel(hit.member.gender))
  }
  if (hit.member.ageYears !== null) {
    bits.push(t('people.ageYears', { count: hit.member.ageYears }))
  }
  return bits.join(' · ')
}

async function loadCatalog() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  try {
    const [{ species }, { pets }] = await Promise.all([
      fetchPetSpecies(),
      listMyPets(token),
    ])
    speciesList.value = species
    myPets.value = pets
  } catch {
    /* catalog is optional for search */
  }
}

async function loadBreedsForSet(set: PetFilterSetRow) {
  set.breedList = []
  set.breedLabel = ''
  const species = speciesList.value.find((item) => item.slug === set.speciesSlug)
  if (!species) {
    return
  }
  try {
    const { breeds } = await fetchPetBreeds(species.id)
    set.breedList = breeds
  } catch {
    set.breedList = []
  }
}

function addPetSet() {
  if (petSets.value.length >= MAX_PET_SETS) {
    return
  }
  petSets.value.push(createEmptySet())
}

function removePetSet(key: string) {
  if (petSets.value.length <= 1) {
    petSets.value = [createEmptySet()]
    return
  }
  petSets.value = petSets.value.filter((set) => set.key !== key)
}

function applyPresetFromPet(petId: number | null) {
  presetPetId.value = petId
  if (!petId) {
    return
  }
  const pet = myPets.value.find((item) => item.id === petId)
  if (!pet) {
    return
  }
  let target = petSets.value.find(
    (set) => !set.speciesSlug && !set.breedLabel && !set.petSex,
  )
  if (!target) {
    if (petSets.value.length < MAX_PET_SETS) {
      target = createEmptySet()
      petSets.value.push(target)
    } else {
      target = petSets.value[petSets.value.length - 1]!
    }
  }
  target.speciesSlug = pet.species.slug
  target.petSex = pet.sex === 'unknown' ? '' : pet.sex
  void loadBreedsForSet(target).then(() => {
    target!.breedLabel = pet.breed?.label ?? ''
  })
}

async function runSearch(offset = 0) {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const { members, total: nextTotal } = await searchMembers(token, {
      q: nameQuery.value,
      gender: gender.value,
      ageMin: Number.isFinite(ageMin.value as number) ? ageMin.value : null,
      ageMax: Number.isFinite(ageMax.value as number) ? ageMax.value : null,
      city: city.value,
      friendsOnly: friendsOnly.value,
      petSets: petSets.value.map((set) => ({
        species: set.speciesSlug,
        breed: set.breedLabel,
        petSex: set.petSex,
      })),
      limit: PAGE_SIZE,
      offset,
    })
    results.value = offset === 0 ? members : [...results.value, ...members]
    total.value = nextTotal
  } catch (error) {
    loadError.value = error instanceof ApiError ? error.message : t('people.loadError')
  } finally {
    isLoading.value = false
  }
}

function clearFilters() {
  nameQuery.value = ''
  gender.value = ''
  ageMin.value = null
  ageMax.value = null
  city.value = ''
  friendsOnly.value = false
  petSets.value = [createEmptySet()]
  presetPetId.value = null
  void runSearch(0)
}

onMounted(async () => {
  await loadCatalog()
  if (auth.user?.city && auth.user.showCity) {
    city.value = auth.user.city
  }
  await runSearch(0)
})
</script>

<template>
  <section class="ui-page-container">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <NuxtLink
        :to="localePath('/app/profile')"
        class="ui-link-back mb-0! inline-flex"
      >
        <Icon :icon="UI_ACTION_ICONS.back" class="ui-icon-sm" aria-hidden="true" />
        {{ $t('people.backToProfile') }}
      </NuxtLink>
      <NuxtLink :to="localePath('/app/friends')" class="ui-link text-sm">
        {{ $t('people.openFriends') }}
      </NuxtLink>
    </div>

    <h1 class="ui-page-title">{{ $t('people.title') }}</h1>
    <p class="ui-page-subtitle mt-2">{{ $t('people.subtitle') }}</p>

    <form
      class="ui-card mt-6 space-y-4 p-4"
      @submit.prevent="runSearch(0)"
    >
      <h2 class="ui-section-title">{{ $t('people.humanFilters') }}</h2>
      <label class="ui-field max-w-xl">
        {{ $t('people.nameSearch') }}
        <input
          v-model="nameQuery"
          type="search"
          class="ui-input"
          maxlength="80"
          autocomplete="off"
          :placeholder="$t('people.nameSearchPlaceholder')"
        />
      </label>
      <label class="flex items-center gap-2 text-sm text-(--ui-text)">
        <input v-model="friendsOnly" type="checkbox" class="ui-checkbox" />
        {{ $t('people.friendsOnly') }}
      </label>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label class="ui-field">
          {{ $t('profile.gender') }}
          <select v-model="gender" class="ui-select">
            <option value="">{{ $t('people.any') }}</option>
            <option v-for="g in USER_GENDERS" :key="g" :value="g">
              {{ genderLabel(g) }}
            </option>
          </select>
        </label>
        <label class="ui-field">
          {{ $t('people.ageMin') }}
          <input v-model.number="ageMin" type="number" min="0" max="120" class="ui-input" />
        </label>
        <label class="ui-field">
          {{ $t('people.ageMax') }}
          <input v-model.number="ageMax" type="number" min="0" max="120" class="ui-input" />
        </label>
        <label class="ui-field">
          {{ $t('profile.city') }}
          <input
            v-model="city"
            type="text"
            maxlength="120"
            class="ui-input"
            :placeholder="$t('profile.cityPlaceholder')"
          />
        </label>
      </div>

      <div class="flex flex-wrap items-end justify-between gap-3 pt-2">
        <h2 class="ui-section-title mb-0">{{ $t('people.petFilters') }}</h2>
        <button
          type="button"
          class="ui-btn-ghost ui-btn-sm"
          :disabled="petSets.length >= MAX_PET_SETS"
          @click="addPetSet"
        >
          {{ $t('people.addPetSet') }}
        </button>
      </div>
      <p class="ui-caption">{{ $t('people.petSetsHint') }}</p>

      <label v-if="myPets.length > 0" class="ui-field max-w-md">
        {{ $t('people.presetFromPet') }}
        <select
          class="ui-select"
          :value="presetPetId ?? ''"
          @change="applyPresetFromPet(Number(($event.target as HTMLSelectElement).value) || null)"
        >
          <option value="">{{ $t('people.presetNone') }}</option>
          <option v-for="pet in myPets" :key="pet.id" :value="pet.id">
            {{ pet.name }} · {{ pet.species.label }}
          </option>
        </select>
      </label>

      <div
        v-for="(set, index) in petSets"
        :key="set.key"
        class="space-y-3 rounded-lg border border-(--ui-border) p-3"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-medium text-(--ui-text)">
            {{ $t('people.petSetLabel', { n: index + 1 }) }}
          </p>
          <button
            type="button"
            class="ui-btn-ghost ui-btn-sm"
            :disabled="petSets.length <= 1"
            @click="removePetSet(set.key)"
          >
            {{ $t('people.removePetSet') }}
          </button>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label class="ui-field">
            {{ $t('people.species') }}
            <select
              v-model="set.speciesSlug"
              class="ui-select"
              @change="loadBreedsForSet(set)"
            >
              <option value="">{{ $t('people.any') }}</option>
              <option v-for="item in speciesList" :key="item.id" :value="item.slug">
                {{ item.label }}
              </option>
            </select>
          </label>
          <label class="ui-field">
            {{ $t('people.breed') }}
            <select
              v-model="set.breedLabel"
              class="ui-select"
              :disabled="!set.speciesSlug"
            >
              <option value="">{{ $t('people.any') }}</option>
              <option v-for="item in set.breedList" :key="item.id" :value="item.label">
                {{ item.label }}
              </option>
            </select>
          </label>
          <label class="ui-field">
            {{ $t('people.petSex') }}
            <select v-model="set.petSex" class="ui-select">
              <option value="">{{ $t('people.any') }}</option>
              <option value="male">{{ $t('petSex.male') }}</option>
              <option value="female">{{ $t('petSex.female') }}</option>
            </select>
          </label>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button type="submit" class="ui-btn-primary ui-btn-sm" :disabled="isLoading">
          {{ isLoading ? $t('people.searching') : $t('people.search') }}
        </button>
        <button type="button" class="ui-btn-secondary ui-btn-sm" @click="clearFilters">
          {{ $t('people.clear') }}
        </button>
      </div>
    </form>

    <p v-if="loadError" class="ui-alert-error mt-4" role="alert">{{ loadError }}</p>
    <p v-else-if="isLoading && results.length === 0" class="ui-loading mt-6">
      {{ $t('people.loading') }}
    </p>
    <p v-else-if="results.length === 0" class="ui-empty mt-6">
      {{ friendsOnly ? $t('people.emptyFriends') : $t('people.empty') }}
    </p>

    <ul v-else class="mt-6 flex list-none flex-col gap-3">
      <li
        v-for="hit in results"
        :key="hit.member.id"
        class="ui-card flex flex-col gap-3 p-4 sm:flex-row sm:items-start"
      >
        <NuxtLink
          :to="localePath(`/members/${hit.member.id}`)"
          class="flex min-w-0 flex-1 items-start gap-3"
        >
          <UserAvatar
            :avatar-url="hit.member.avatarUrl"
            :label="memberInitial(hit.member.displayName)"
            size="md"
          />
          <div class="min-w-0">
            <p class="font-semibold text-stone-900">{{ hit.member.displayName }}</p>
            <p v-if="memberMeta(hit)" class="ui-caption mt-0.5">{{ memberMeta(hit) }}</p>
            <ul
              v-if="hit.pets.length > 0"
              class="mt-2 flex list-none flex-wrap gap-2"
            >
              <li
                v-for="pet in hit.pets"
                :key="pet.id"
                class="inline-flex items-center gap-1.5 rounded-full bg-(--ui-surface-muted) px-2 py-1 text-xs text-(--ui-text)"
              >
                <PetAvatar :species-slug="pet.speciesSlug" size="sm" />
                <span>{{ pet.name }} · {{ pet.speciesLabel }}</span>
              </li>
            </ul>
          </div>
        </NuxtLink>
        <MemberFriendActions :member-id="hit.member.id" />
      </li>
    </ul>

    <div v-if="results.length < total" class="mt-6 flex justify-center">
      <button
        type="button"
        class="ui-btn-secondary ui-btn-md disabled:opacity-50"
        :disabled="isLoading"
        @click="runSearch(results.length)"
      >
        {{ isLoading ? $t('people.searching') : $t('people.loadMore') }}
      </button>
    </div>
  </section>
</template>
