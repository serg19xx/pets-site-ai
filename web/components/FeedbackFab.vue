<script setup lang="ts">
import { fetchFeedbackAccess } from '~/lib/feedback-api'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { useAuthStore } from '~/stores/auth'

const localePath = useLocalePath()
const auth = useAuthStore()
const route = useRoute()

const canShow = ref(false)

const isOnFeedback = computed(() => {
  const path = route.path
  return path.includes('/app/feedback')
})

const newFeedbackTo = computed(() => {
  return localePath({
    path: '/app/feedback/new',
    query: { from: route.fullPath },
  })
})

async function refreshAccess() {
  const token = auth.accessToken
  if (!token || auth.user?.isAdmin) {
    canShow.value = false
    return
  }
  try {
    const access = await fetchFeedbackAccess(token)
    canShow.value = access.isBetaTester
  } catch {
    canShow.value = Boolean(auth.user?.isBetaTester)
  }
}

watch(
  () => auth.accessToken,
  () => {
    void refreshAccess()
  },
  { immediate: true },
)

watch(
  () => auth.user?.isBetaTester,
  () => {
    void refreshAccess()
  },
)
</script>

<template>
  <NuxtLink
    v-if="canShow && !isOnFeedback"
    :to="newFeedbackTo"
    class="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 lg:bottom-6"
    :aria-label="$t('feedback.fabLabel')"
  >
    <Icon :icon="UI_ACTION_ICONS.message" class="ui-icon-sm" aria-hidden="true" />
    <span class="hidden sm:inline">{{ $t('feedback.fabLabel') }}</span>
  </NuxtLink>
</template>
