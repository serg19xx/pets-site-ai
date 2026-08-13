<script setup lang="ts">
import { ApiError } from '~/lib/auth-api'
import {
  acceptFriendRequest,
  declineFriendRequest,
  fetchFriendStatus,
  removeFriend,
  sendFriendRequest,
  type FriendRelationStatus,
} from '~/lib/friends-api'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  memberId: number
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()
const authUiReady = useAuthUiReady()

const status = ref<FriendRelationStatus | null>(null)
const isWorking = ref(false)
const actionError = ref('')

const loginTo = computed(() => ({
  path: localePath('/login'),
  query: { redirect: route.fullPath },
}))

const isOwnProfile = computed(() => auth.user?.id === props.memberId)

async function loadStatus() {
  const token = auth.accessToken
  if (!token || isOwnProfile.value) {
    status.value = isOwnProfile.value ? 'self' : null
    return
  }
  try {
    const result = await fetchFriendStatus(props.memberId, token)
    status.value = result.status
  } catch {
    status.value = 'none'
  }
}

watch(
  [authUiReady, () => auth.accessToken, () => props.memberId],
  ([ready]) => {
    if (!ready) {
      return
    }
    void loadStatus()
  },
  { immediate: true },
)

async function run(action: () => Promise<void>) {
  const token = auth.accessToken
  if (!token || isWorking.value) {
    return
  }
  isWorking.value = true
  actionError.value = ''
  try {
    await action()
  } catch (error) {
    actionError.value =
      error instanceof ApiError ? error.message : t('friends.actionError')
  } finally {
    isWorking.value = false
  }
}

function onAdd() {
  void run(async () => {
    const result = await sendFriendRequest(props.memberId, auth.accessToken!)
    status.value = result.status
  })
}

function onAccept() {
  void run(async () => {
    const result = await acceptFriendRequest(props.memberId, auth.accessToken!)
    status.value = result.status
  })
}

function onDecline() {
  void run(async () => {
    await declineFriendRequest(props.memberId, auth.accessToken!)
    status.value = 'none'
  })
}

function onRemove() {
  void run(async () => {
    await removeFriend(props.memberId, auth.accessToken!)
    status.value = 'none'
  })
}
</script>

<template>
  <div class="mt-3">
    <p v-if="!authUiReady" class="ui-caption">{{ $t('common.loading') }}</p>

    <p v-else-if="auth.isGuest" class="ui-caption">
      <NuxtLink :to="loginTo" class="ui-link">{{ $t('friends.loginToAdd') }}</NuxtLink>
    </p>

    <p v-else-if="status === 'self'" class="ui-caption">
      {{ $t('friends.thisIsYou') }}
    </p>

    <p v-else-if="status === null" class="ui-caption">{{ $t('common.loading') }}</p>

    <div v-else class="flex flex-wrap items-center gap-2">
      <button
        v-if="status === 'none'"
        type="button"
        class="ui-btn-primary ui-btn-sm"
        :disabled="isWorking"
        @click="onAdd"
      >
        {{ isWorking ? $t('friends.working') : $t('friends.add') }}
      </button>

      <template v-else-if="status === 'outgoing'">
        <span class="ui-caption">{{ $t('friends.requestSent') }}</span>
        <button
          type="button"
          class="ui-btn-ghost ui-btn-sm"
          :disabled="isWorking"
          @click="onRemove"
        >
          {{ $t('friends.cancelRequest') }}
        </button>
      </template>

      <template v-else-if="status === 'incoming'">
        <span class="ui-caption">{{ $t('friends.theyAsked') }}</span>
        <button
          type="button"
          class="ui-btn-primary ui-btn-sm"
          :disabled="isWorking"
          @click="onAccept"
        >
          {{ $t('friends.accept') }}
        </button>
        <button
          type="button"
          class="ui-btn-ghost ui-btn-sm"
          :disabled="isWorking"
          @click="onDecline"
        >
          {{ $t('friends.decline') }}
        </button>
      </template>

      <template v-else-if="status === 'friends'">
        <span class="ui-caption">{{ $t('friends.youAreFriends') }}</span>
        <button
          type="button"
          class="ui-btn-ghost ui-btn-sm"
          :disabled="isWorking"
          @click="onRemove"
        >
          {{ $t('friends.unfriend') }}
        </button>
      </template>
    </div>

    <p v-if="actionError" class="ui-alert-error mt-2" role="alert">
      {{ actionError }}
    </p>
  </div>
</template>
