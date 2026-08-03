<script setup lang="ts">
import {
  ApiError,
  fetchBetaStatus,
  joinBetaTester,
  type BetaStatus,
} from '~/lib/auth-api'
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()
const authUiReady = useAuthUiReady()

usePageSeo({
  title: computed(() => t('meta.invite.title')),
  description: computed(() => t('meta.invite.description')),
  path: computed(() => localePath('/invite')),
})

const accepted = ref(false)
const status = ref<BetaStatus | null>(null)
const loadError = ref('')
const actionError = ref('')
const actionSuccess = ref('')
const isJoining = ref(false)

const remaining = computed(() => {
  if (!status.value) {
    return 0
  }
  return Math.max(0, status.value.capacity - status.value.acceptedCount)
})

const inviteToken = computed(() => status.value?.inviteToken ?? '')

const registerTo = computed(() =>
  localePath({
    path: '/app/auth',
    query: {
      mode: 'register',
      invite: inviteToken.value || undefined,
    },
  }),
)

const loginTo = computed(() =>
  localePath({
    path: '/login',
    query: {
      invite: inviteToken.value || undefined,
      redirect: localePath('/invite'),
    },
  }),
)

const regularRegisterTo = computed(() =>
  localePath({
    path: '/app/auth',
    query: { mode: 'register' },
  }),
)

async function loadStatus() {
  loadError.value = ''
  try {
    status.value = await fetchBetaStatus()
  } catch (error) {
    loadError.value =
      error instanceof ApiError ? error.message : t('invite.loadError')
  }
}

async function onJoin() {
  actionError.value = ''
  actionSuccess.value = ''
  if (!accepted.value) {
    actionError.value = t('invite.mustAccept')
    return
  }
  if (!auth.accessToken || !inviteToken.value) {
    return
  }
  isJoining.value = true
  try {
    const result = await joinBetaTester(auth.accessToken, {
      betaInvite: inviteToken.value,
      acceptedTerms: true,
    })
    actionSuccess.value = result.message || t('invite.joinSuccess')
    if (auth.user) {
      auth.updateUser({ ...auth.user, isBetaTester: true })
    }
    await loadStatus()
  } catch (error) {
    actionError.value =
      error instanceof ApiError ? error.message : t('invite.loadError')
  } finally {
    isJoining.value = false
  }
}

function requireAccepted(event: Event) {
  if (accepted.value) {
    return
  }
  event.preventDefault()
  actionError.value = t('invite.mustAccept')
}

onMounted(() => {
  auth.hydrateFromStorage()
  void loadStatus()
})
</script>

<template>
  <section class="ui-page-container mx-auto max-w-2xl">
    <p class="ui-overline">{{ $t('invite.eyebrow') }}</p>
    <h1 class="ui-page-title mt-2">{{ $t('invite.title') }}</h1>
    <p class="ui-lead mt-3">{{ $t('invite.lead') }}</p>

    <p v-if="loadError" class="ui-alert-error mt-6" role="alert">
      {{ loadError }}
    </p>

    <template v-else-if="status">
      <p
        class="mt-4 text-sm font-medium"
        :class="status.open ? 'text-emerald-800 dark:text-emerald-300' : 'text-(--ui-text-muted)'"
      >
        {{
          status.open
            ? $t('invite.spots', { remaining, capacity: status.capacity })
            : $t('invite.spotsFull', { capacity: status.capacity })
        }}
      </p>

      <div class="ui-card mt-8 space-y-6 p-5 sm:p-6">
        <section>
          <h2 class="text-base font-semibold text-stone-900 dark:text-stone-100">
            {{ $t('invite.whyTitle') }}
          </h2>
          <p class="ui-body mt-2">{{ $t('invite.whyBody') }}</p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-stone-900 dark:text-stone-100">
            {{ $t('invite.privacyTitle') }}
          </h2>
          <p class="ui-body mt-2">{{ $t('invite.privacyBody') }}</p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-stone-900 dark:text-stone-100">
            {{ $t('invite.rewardsTitle') }}
          </h2>
          <p class="ui-body mt-2">{{ $t('invite.rewardsBody') }}</p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-stone-900 dark:text-stone-100">
            {{ $t('invite.benefitTitle') }}
          </h2>
          <p class="ui-body mt-2">{{ $t('invite.benefitBody') }}</p>
        </section>
      </div>

      <label class="mt-8 flex cursor-pointer items-start gap-3">
        <input
          v-model="accepted"
          type="checkbox"
          class="mt-1 size-4 rounded border-stone-400"
          :disabled="Boolean(authUiReady && auth.isAuthenticated && auth.user?.isBetaTester)"
        />
        <span class="text-sm text-stone-800 dark:text-stone-200">
          {{ $t('invite.acceptLabel') }}
        </span>
      </label>

      <p v-if="actionError" class="ui-alert-error mt-4" role="alert">
        {{ actionError }}
      </p>
      <p v-else-if="actionSuccess" class="mt-4 text-sm text-emerald-800 dark:text-emerald-300">
        {{ actionSuccess }}
      </p>

      <div v-if="authUiReady && auth.isAuthenticated" class="mt-6 flex flex-col gap-3">
        <p
          v-if="auth.user?.isBetaTester"
          class="text-sm font-medium text-emerald-800 dark:text-emerald-300"
        >
          {{ $t('invite.alreadyTester') }}
        </p>
        <template v-else-if="status.open">
          <button
            type="button"
            class="ui-btn-primary ui-btn-md disabled:opacity-50"
            :disabled="!accepted || isJoining"
            @click="onJoin"
          >
            {{ isJoining ? $t('invite.joining') : $t('invite.joinCta') }}
          </button>
        </template>
        <NuxtLink :to="localePath('/')" class="ui-link">
          {{ $t('auth.goToGallery') }}
        </NuxtLink>
      </div>

      <div v-else class="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <NuxtLink
          v-if="status.open"
          :to="registerTo"
          class="ui-btn-primary ui-btn-md text-center"
          :class="{ 'pointer-events-none opacity-50': !accepted }"
          :tabindex="accepted ? undefined : -1"
          :aria-disabled="!accepted"
          @click="requireAccepted"
        >
          {{ $t('invite.registerCta') }}
        </NuxtLink>
        <NuxtLink
          v-if="status.open"
          :to="loginTo"
          class="ui-btn-secondary ui-btn-md text-center"
          :class="{ 'pointer-events-none opacity-50': !accepted }"
          :tabindex="accepted ? undefined : -1"
          :aria-disabled="!accepted"
          @click="requireAccepted"
        >
          {{ $t('invite.loginCta') }}
        </NuxtLink>
        <NuxtLink
          :to="regularRegisterTo"
          class="ui-link self-center text-sm"
        >
          {{ $t('invite.regularRegister') }}
        </NuxtLink>
      </div>
    </template>

    <p v-else class="ui-loading mt-8">{{ $t('common.loading') }}</p>
  </section>
</template>
