<script setup lang="ts">
import PetAvatar from '~/components/PetAvatar.vue'
import { ApiError } from '~/lib/auth-api'
import {
  createPetFriendship,
  deletePetFriendship,
} from '~/lib/pet-friendships-api'
import { listMyPets } from '~/lib/pets-api'
import { useAuthStore } from '~/stores/auth'
import type { GalleryPet } from '~/types/gallery'
import type { Pet } from '~/types/pet'

const props = defineProps<{
  targetPet: GalleryPet
}>()

const emit = defineEmits<{
  updated: []
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()
const authUiReady = useAuthUiReady()

const pickerOpen = ref(false)
const myPets = ref<Pet[]>([])
const isLoadingPets = ref(false)
const isSubmitting = ref(false)
const actionError = ref('')
const selectedPetId = ref<number | null>(null)

const friends = computed(() => props.targetPet.friends ?? [])
const exchanges = computed(() =>
  (props.targetPet.friendExchanges ?? []).filter((e) => e.lines.length > 0),
)

function lineText(line: { body: string; bodyFr: string }) {
  return locale.value === 'fr' ? line.bodyFr || line.body : line.body
}

const myPetIds = computed(() => new Set(myPets.value.map((p) => p.id)))

const friendWithMyPet = computed(() =>
  friends.value.find((f) => myPetIds.value.has(f.id)) ?? null,
)

const alreadyFriends = computed(() => Boolean(friendWithMyPet.value))

const canAct = computed(
  () => authUiReady.value && auth.isAuthenticated && Boolean(auth.accessToken),
)

const isOwnHouseholdPet = computed(() => {
  const memberId = props.targetPet.member?.id
  const myId = auth.user?.id
  return Boolean(memberId && myId && memberId === myId)
})

const canProposeFriendship = computed(
  () => canAct.value && !isOwnHouseholdPet.value && !alreadyFriends.value,
)

const pickerCandidates = computed(() =>
  myPets.value.filter(
    (p) =>
      p.id !== props.targetPet.id &&
      p.species.slug === props.targetPet.species.slug,
  ),
)

async function ensureMyPetsLoaded() {
  const token = auth.accessToken
  if (!token || myPets.value.length > 0) {
    return
  }
  isLoadingPets.value = true
  actionError.value = ''
  try {
    const { pets } = await listMyPets(token)
    myPets.value = pets
  } catch (err) {
    actionError.value =
      err instanceof ApiError ? err.message : t('pet.friendsLoadMyPetsError')
  } finally {
    isLoadingPets.value = false
  }
}

watch(
  canAct,
  (ready) => {
    if (ready) {
      void ensureMyPetsLoaded()
    } else {
      myPets.value = []
    }
  },
  { immediate: true },
)

async function openPicker() {
  if (!canProposeFriendship.value) {
    return
  }
  actionError.value = ''
  await ensureMyPetsLoaded()
  if (pickerCandidates.value.length === 0) {
    const hasOtherSpecies = myPets.value.some(
      (p) =>
        p.id !== props.targetPet.id &&
        p.species.slug !== props.targetPet.species.slug,
    )
    actionError.value = hasOtherSpecies
      ? t('pet.friendsSameSpeciesOnly', {
          species: props.targetPet.species.label,
        })
      : t('pet.friendsNoPets')
    return
  }
  selectedPetId.value =
    pickerCandidates.value.length === 1 ? pickerCandidates.value[0]!.id : null
  pickerOpen.value = true
}

function closePicker() {
  if (isSubmitting.value) {
    return
  }
  pickerOpen.value = false
  selectedPetId.value = null
}

async function confirmFriendship() {
  const token = auth.accessToken
  const fromId = selectedPetId.value == null ? null : Number(selectedPetId.value)
  if (!token || fromId == null || !Number.isInteger(fromId) || isSubmitting.value) {
    return
  }
  isSubmitting.value = true
  actionError.value = ''
  try {
    await createPetFriendship(fromId, props.targetPet.id, token)
    pickerOpen.value = false
    selectedPetId.value = null
    emit('updated')
  } catch (err) {
    actionError.value =
      err instanceof ApiError ? err.message : t('pet.friendsCreateError')
  } finally {
    isSubmitting.value = false
  }
}

async function onUnfriend() {
  const token = auth.accessToken
  const mine = friendWithMyPet.value
  if (!token || !mine || isSubmitting.value) {
    return
  }
  isSubmitting.value = true
  actionError.value = ''
  try {
    await deletePetFriendship(mine.id, props.targetPet.id, token)
    emit('updated')
  } catch (err) {
    actionError.value =
      err instanceof ApiError ? err.message : t('pet.friendsRemoveError')
  } finally {
    isSubmitting.value = false
  }
}

function friendPath(id: number) {
  return localePath(`/animals/${id}`)
}
</script>

<template>
  <div class="ui-pet-friends">
    <div class="ui-pet-friends-head">
      <h2 class="ui-section-title">{{ $t('pet.friendsHeading') }}</h2>
      <div v-if="canAct" class="ui-pet-friends-actions">
        <button
          v-if="alreadyFriends"
          type="button"
          class="ui-btn ui-btn-sm ui-btn-ghost"
          :disabled="isSubmitting"
          @click="onUnfriend"
        >
          {{ $t('pet.friendsUnfriend') }}
        </button>
        <button
          v-else-if="canProposeFriendship"
          type="button"
          class="ui-btn ui-btn-sm ui-btn-secondary"
          :disabled="isLoadingPets || isSubmitting"
          @click="openPicker"
        >
          {{ $t('pet.friendsMake') }}
        </button>
      </div>
    </div>

    <p v-if="isOwnHouseholdPet && !alreadyFriends" class="ui-hint mt-2">
      {{ $t('pet.friendsSameOwnerHint') }}
    </p>

    <p v-if="actionError" class="ui-alert-error mt-2" role="alert">
      {{ actionError }}
    </p>

    <p v-if="friends.length === 0" class="ui-empty mt-3">
      {{ $t('pet.friendsEmpty') }}
    </p>
    <ul v-else class="ui-pet-friends-list">
      <li v-for="friend in friends" :key="friend.id">
        <NuxtLink :to="friendPath(friend.id)" class="ui-pet-friend-link">
          <PetAvatar :pet="friend" size="sm" />
          <span class="ui-pet-friend-meta">
            <span class="ui-pet-friend-name">{{ friend.name }}</span>
            <span class="ui-pet-friend-species">{{ friend.species.label }}</span>
          </span>
        </NuxtLink>
      </li>
    </ul>

    <div v-if="exchanges.length > 0" class="ui-pet-friend-exchanges">
      <h3 class="ui-pet-friend-exchanges-title">
        {{ $t('pet.friendsExchangesHeading') }}
      </h3>
      <p class="ui-hint">{{ $t('pet.friendsExchangesHint') }}</p>
      <article
        v-for="exchange in exchanges"
        :key="exchange.friend.id"
        class="ui-pet-friend-exchange"
      >
        <NuxtLink
          :to="friendPath(exchange.friend.id)"
          class="ui-pet-friend-exchange-with"
        >
          {{
            $t('pet.friendsExchangeWith', { name: exchange.friend.name })
          }}
        </NuxtLink>
        <ul class="ui-pet-friend-exchange-lines">
          <li
            v-for="line in exchange.lines"
            :key="`${exchange.friend.id}-${line.turn}`"
            class="ui-pet-friend-exchange-line"
          >
            <span class="ui-pet-friend-exchange-speaker">
              {{ line.speakerName }}
            </span>
            <p class="ui-pet-friend-exchange-body">
              {{ lineText(line) }}
            </p>
          </li>
        </ul>
      </article>
    </div>

    <Teleport to="body">
      <div
        v-if="pickerOpen"
        class="ui-modal-backdrop"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('pet.friendsPickerTitle')"
        @click.self="closePicker"
      >
        <div class="ui-modal ui-pet-friends-modal" @click.stop>
          <header class="ui-modal-header">
            <h2 class="ui-modal-title">{{ $t('pet.friendsPickerTitle') }}</h2>
            <button
              type="button"
              class="ui-btn ui-btn-sm ui-btn-ghost"
              :disabled="isSubmitting"
              @click="closePicker"
            >
              {{ $t('common.cancel') }}
            </button>
          </header>
          <p class="ui-hint px-4">
            {{ $t('pet.friendsPickerHint', { name: targetPet.name }) }}
          </p>
          <ul class="ui-pet-friends-picker-list">
            <li v-for="pet in pickerCandidates" :key="pet.id">
              <label class="ui-pet-friends-picker-item">
                <input
                  v-model="selectedPetId"
                  type="radio"
                  name="friend-from-pet"
                  :value="pet.id"
                  :disabled="isSubmitting"
                />
                <PetAvatar :pet="pet" size="sm" />
                <span>{{ pet.name }}</span>
              </label>
            </li>
          </ul>
          <footer class="ui-modal-footer">
            <button
              type="button"
              class="ui-btn ui-btn-md ui-btn-primary"
              :disabled="selectedPetId == null || isSubmitting"
              @click="confirmFriendship"
            >
              {{
                isSubmitting
                  ? $t('pet.friendsWorking')
                  : $t('pet.friendsConfirm')
              }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>
