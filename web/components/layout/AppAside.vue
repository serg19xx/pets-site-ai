<script setup lang="ts">
import { ApiError, fetchBetaStatus } from '~/lib/auth-api'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const authUiReady = useAuthUiReady()
const route = useRoute()
const localePath = useLocalePath()

const betaOpen = ref(false)
const betaCapacity = ref(20)

const signUpTo = computed(() => {
  const redirect = encodeURIComponent(route.fullPath)
  return localePath({
    path: '/app/auth',
    query: { mode: 'register', redirect },
  })
})

const showBetaBanner = computed(
  () =>
    authUiReady.value &&
    auth.isAuthenticated &&
    !auth.user?.isBetaTester &&
    betaOpen.value,
)

async function loadBetaBanner() {
  if (!authUiReady.value || auth.isGuest) {
    betaOpen.value = false
    return
  }
  if (auth.user?.isBetaTester) {
    betaOpen.value = false
    return
  }
  try {
    const status = await fetchBetaStatus()
    betaOpen.value = status.open
    betaCapacity.value = status.capacity
  } catch (error) {
    if (!(error instanceof ApiError)) {
      // ignore — banner is optional
    }
    betaOpen.value = false
  }
}

watch(
  [authUiReady, () => auth.isAuthenticated, () => auth.user?.isBetaTester],
  () => {
    void loadBetaBanner()
  },
  { immediate: true },
)
</script>

<template>
  <aside class="w-72 shrink-0 p-4">
    <div
      v-if="!authUiReady"
      class="ui-panel min-h-38"
      aria-hidden="true"
    />

    <div
      v-else-if="auth.isGuest"
      class="ui-panel"
    >
      <h2 class="ui-panel-title">
        {{ $t('aside.joinTitle') }}
      </h2>
      <p class="ui-page-subtitle mt-2">
        {{ $t('aside.joinText') }}
      </p>
      <NuxtLink
        :to="signUpTo"
        class="ui-btn-primary ui-btn-sm ui-btn-block mt-4"
      >
        {{ $t('aside.createAccount') }}
      </NuxtLink>
    </div>

    <template v-else>
      <div
        v-if="showBetaBanner"
        class="ui-panel mb-4 border-(--ui-border-strong)"
      >
        <h2 class="ui-panel-title">
          {{ $t('aside.betaTitle') }}
        </h2>
        <p class="ui-page-subtitle mt-2">
          {{ $t('aside.betaText', { capacity: betaCapacity }) }}
        </p>
        <NuxtLink
          :to="localePath('/invite')"
          class="ui-btn-secondary ui-btn-sm ui-btn-block mt-4"
        >
          {{ $t('aside.betaCta') }}
        </NuxtLink>
      </div>

      <UnderConstructionPanel
        compact
        :title="$t('aside.tipsTitle')"
        :purpose="$t('aside.tipsPurpose')"
      />
    </template>
  </aside>
</template>
