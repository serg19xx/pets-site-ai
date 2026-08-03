<script setup lang="ts">
import { ApiError } from '~/lib/auth-api'
import { fetchFeedbackAccess, fetchFeedbackTickets } from '~/lib/feedback-api'
import { useAuthStore } from '~/stores/auth'
import type { FeedbackTicketSummary } from '~/types/feedback'

definePageMeta({
  layout: 'app',
  middleware: ['auth', 'block-admin'],
  ssr: false,
})

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()
const { formatIso } = useDateTime()

const tickets = ref<FeedbackTicketSummary[]>([])
const isLoading = ref(true)
const loadError = ref('')
const isRefreshing = ref(false)
const forbidden = ref(false)

async function loadTickets(options?: { silent?: boolean }) {
  const token = auth.accessToken
  if (!token || forbidden.value) {
    return
  }
  const silent = options?.silent === true
  if (silent) {
    isRefreshing.value = true
  } else {
    isLoading.value = true
  }
  loadError.value = ''
  try {
    const access = await fetchFeedbackAccess(token)
    if (!access.isBetaTester) {
      forbidden.value = true
      return
    }
    const { tickets: list } = await fetchFeedbackTickets(token, 'mine', {
      limit: 50,
    })
    tickets.value = list
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      forbidden.value = true
    }
    loadError.value = err instanceof ApiError ? err.message : t('feedback.loadError')
  } finally {
    isRefreshing.value = false
    isLoading.value = false
  }
}

onMounted(() => {
  void loadTickets()
})

function preview(message: string): string {
  const trimmed = message.trim()
  if (trimmed.length <= 120) {
    return trimmed
  }
  return `${trimmed.slice(0, 117)}…`
}
</script>

<template>
  <section class="ui-page-container">
    <NuxtLink :to="localePath('/app/profile')" class="ui-link-back mb-0! inline-flex">
      {{ $t('feedback.backToProfile') }}
    </NuxtLink>

    <div class="mt-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="ui-page-title">{{ $t('feedback.title') }}</h1>
        <p class="ui-page-subtitle mt-2">{{ $t('feedback.subtitle') }}</p>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="ui-btn-sm ui-btn-secondary"
          :disabled="isRefreshing || forbidden"
          @click="loadTickets({ silent: true })"
        >
          {{ isRefreshing ? $t('common.loading') : $t('common.refresh') }}
        </button>
        <NuxtLink
          v-if="!forbidden"
          :to="localePath('/app/feedback/new')"
          class="ui-btn-primary ui-btn-sm"
        >
          {{ $t('feedback.newCta') }}
        </NuxtLink>
      </div>
    </div>

    <p v-if="forbidden" class="ui-alert-error mt-6" role="alert">
      {{ $t('feedback.betaOnly') }}
      <NuxtLink :to="localePath('/invite')" class="ui-link ml-1">
        {{ $t('feedback.betaInviteLink') }}
      </NuxtLink>
    </p>

    <template v-else>
      <p v-if="isLoading" class="ui-loading mt-6">{{ $t('common.loading') }}</p>
      <p v-else-if="loadError" class="ui-alert-error mt-6" role="alert">{{ loadError }}</p>
      <p v-else-if="tickets.length === 0" class="ui-empty mt-8">
        {{ $t('feedback.empty') }}
      </p>

      <ul v-else class="mt-6 flex list-none flex-col gap-3">
        <li v-for="item in tickets" :key="item.id">
          <NuxtLink
            :to="localePath(`/app/feedback/${item.id}`)"
            class="ui-card block p-4 transition hover:bg-(--ui-surface-muted)/30"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-md px-2 py-0.5 text-xs font-semibold"
                :class="
                  item.type === 'bug'
                    ? 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100'
                    : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
                "
              >
                {{ $t(`feedback.type.${item.type}`) }}
              </span>
              <span class="rounded-md bg-(--ui-surface-muted) px-2 py-0.5 text-xs font-medium">
                {{ $t(`feedback.status.${item.status}`) }}
              </span>
              <span class="ui-caption ml-auto">{{ formatIso(item.createdAt) }}</span>
            </div>
            <p class="mt-2 text-sm text-stone-800 dark:text-stone-200">
              {{ preview(item.message) }}
            </p>
            <p class="ui-caption mt-2">
              <span v-if="item.messageCount > 0">
                {{ $t('feedback.replyCount', { count: item.messageCount }) }}
              </span>
            </p>
          </NuxtLink>
        </li>
      </ul>
    </template>
  </section>
</template>
