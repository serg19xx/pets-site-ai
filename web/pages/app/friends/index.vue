<script setup lang="ts">
import MemberFriendRow from '~/components/MemberFriendRow.vue'
import { ApiError } from '~/lib/auth-api'
import {
  acceptFriendRequest,
  declineFriendRequest,
  fetchFriendsOverview,
  removeFriend,
  type FriendMember,
  type FriendRequestMember,
} from '~/lib/friends-api'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()

const friends = ref<FriendMember[]>([])
const incoming = ref<FriendRequestMember[]>([])
const outgoing = ref<FriendRequestMember[]>([])
const isLoading = ref(true)
const loadError = ref('')
const actionError = ref('')
const busyUserId = ref<number | null>(null)
const listQuery = ref('')

function matchesQuery(person: { displayName: string }, query: string) {
  if (!query) {
    return true
  }
  return person.displayName.toLowerCase().includes(query)
}

const normalizedQuery = computed(() => listQuery.value.trim().toLowerCase())

const filteredIncoming = computed(() =>
  incoming.value.filter((person) => matchesQuery(person, normalizedQuery.value)),
)
const filteredOutgoing = computed(() =>
  outgoing.value.filter((person) => matchesQuery(person, normalizedQuery.value)),
)
const filteredFriends = computed(() =>
  friends.value.filter((person) => matchesQuery(person, normalizedQuery.value)),
)

const hasAnyPeople = computed(
  () => friends.value.length + incoming.value.length + outgoing.value.length > 0,
)

const hasFilteredResults = computed(
  () =>
    filteredFriends.value.length +
      filteredIncoming.value.length +
      filteredOutgoing.value.length >
    0,
)

async function loadFriends(options?: { silent?: boolean }) {
  const token = auth.accessToken
  if (!token) {
    return
  }
  if (!options?.silent) {
    isLoading.value = true
  }
  loadError.value = ''
  try {
    const result = await fetchFriendsOverview(token)
    friends.value = result.friends
    incoming.value = result.incoming
    outgoing.value = result.outgoing
  } catch (error) {
    loadError.value = error instanceof ApiError ? error.message : t('friends.loadError')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadFriends()
})

async function run(userId: number, action: () => Promise<void>) {
  if (!auth.accessToken || busyUserId.value !== null) {
    return
  }
  busyUserId.value = userId
  actionError.value = ''
  try {
    await action()
    await loadFriends({ silent: true })
  } catch (error) {
    actionError.value =
      error instanceof ApiError ? error.message : t('friends.actionError')
  } finally {
    busyUserId.value = null
  }
}

function onAccept(userId: number) {
  void run(userId, () => acceptFriendRequest(userId, auth.accessToken!))
}

function onDecline(userId: number) {
  void run(userId, () => declineFriendRequest(userId, auth.accessToken!))
}

function onRemove(userId: number) {
  void run(userId, () => removeFriend(userId, auth.accessToken!))
}
</script>

<template>
  <section class="ui-page-container">
    <NuxtLink :to="localePath('/app/profile')" class="ui-link-back mb-0! inline-flex">
      <Icon :icon="UI_ACTION_ICONS.back" class="ui-icon-sm" aria-hidden="true" />
      {{ $t('friends.backToProfile') }}
    </NuxtLink>

    <div class="mt-4 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="ui-page-title">{{ $t('friends.title') }}</h1>
        <p class="ui-page-subtitle mt-2">{{ $t('friends.subtitle') }}</p>
      </div>
      <NuxtLink :to="localePath('/app/people')" class="ui-btn-secondary ui-btn-sm shrink-0">
        {{ $t('people.navTitle') }}
      </NuxtLink>
    </div>

    <p v-if="isLoading" class="ui-loading mt-6">{{ $t('common.loading') }}</p>
    <p v-else-if="loadError" class="ui-alert-error mt-6" role="alert">
      {{ loadError }}
    </p>

    <template v-else>
      <p v-if="actionError" class="ui-alert-error mt-6" role="alert">
        {{ actionError }}
      </p>

      <label v-if="hasAnyPeople" class="ui-field mt-6 max-w-md">
        {{ $t('friends.filterLabel') }}
        <input
          v-model="listQuery"
          type="search"
          class="ui-input"
          maxlength="80"
          autocomplete="off"
          :placeholder="$t('friends.filterPlaceholder')"
        />
      </label>

      <p
        v-if="hasAnyPeople && normalizedQuery && !hasFilteredResults"
        class="ui-empty mt-6"
      >
        {{ $t('friends.filterEmpty') }}
      </p>

      <template v-else>
        <section v-if="filteredIncoming.length > 0" class="mt-8">
          <h2 class="ui-section-title">{{ $t('friends.incomingHeading') }}</h2>
          <ul class="mt-3 flex list-none flex-col gap-2">
            <li v-for="person in filteredIncoming" :key="`in-${person.id}`">
              <MemberFriendRow :member="person">
                <button
                  type="button"
                  class="ui-btn-primary ui-btn-sm"
                  :disabled="busyUserId !== null"
                  @click="onAccept(person.id)"
                >
                  {{ $t('friends.accept') }}
                </button>
                <button
                  type="button"
                  class="ui-btn-ghost ui-btn-sm"
                  :disabled="busyUserId !== null"
                  @click="onDecline(person.id)"
                >
                  {{ $t('friends.decline') }}
                </button>
              </MemberFriendRow>
            </li>
          </ul>
        </section>

        <section v-if="filteredOutgoing.length > 0" class="mt-8">
          <h2 class="ui-section-title">{{ $t('friends.outgoingHeading') }}</h2>
          <ul class="mt-3 flex list-none flex-col gap-2">
            <li v-for="person in filteredOutgoing" :key="`out-${person.id}`">
              <MemberFriendRow :member="person">
                <button
                  type="button"
                  class="ui-btn-ghost ui-btn-sm"
                  :disabled="busyUserId !== null"
                  @click="onRemove(person.id)"
                >
                  {{ $t('friends.cancelRequest') }}
                </button>
              </MemberFriendRow>
            </li>
          </ul>
        </section>

        <section class="mt-8">
          <h2 class="ui-section-title">{{ $t('friends.listHeading') }}</h2>
          <p v-if="friends.length === 0" class="ui-empty mt-4">
            {{ $t('friends.empty') }}
            <NuxtLink
              :to="localePath('/app/people')"
              class="ui-text-link mt-2 inline-block"
            >
              {{ $t('people.navTitle') }}
            </NuxtLink>
          </p>
          <ul v-else-if="filteredFriends.length > 0" class="mt-3 flex list-none flex-col gap-2">
            <li v-for="person in filteredFriends" :key="`fr-${person.id}`">
              <MemberFriendRow :member="person">
                <button
                  type="button"
                  class="ui-btn-ghost ui-btn-sm"
                  :disabled="busyUserId !== null"
                  @click="onRemove(person.id)"
                >
                  {{ $t('friends.unfriend') }}
                </button>
              </MemberFriendRow>
            </li>
          </ul>
        </section>
      </template>
    </template>
  </section>
</template>
