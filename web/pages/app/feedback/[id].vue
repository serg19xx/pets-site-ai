<script setup lang="ts">
import { ApiError } from '~/lib/auth-api'
import {
  fetchFeedbackTicket,
  replyFeedbackTicket,
} from '~/lib/feedback-api'
import { mediaUrl } from '~/lib/media'
import { useAuthStore } from '~/stores/auth'
import type { FeedbackTicketDetail } from '~/types/feedback'

definePageMeta({
  layout: 'app',
  middleware: ['auth', 'block-admin'],
  ssr: false,
})

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()
const { formatIso } = useDateTime()

const ticketId = computed(() => Number(route.params.id))
const ticket = ref<FeedbackTicketDetail | null>(null)
const isLoading = ref(true)
const loadError = ref('')
const replyBody = ref('')
const isSending = ref(false)
const sendError = ref('')
const isRefreshing = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

const screenshotSrc = computed(() => mediaUrl(ticket.value?.screenshotUrl))

const canReply = computed(() => ticket.value?.status === 'open')

async function loadTicket(options?: { silent?: boolean }) {
  const id = ticketId.value
  const token = auth.accessToken
  if (!token || !Number.isInteger(id) || id < 1) {
    loadError.value = t('feedback.invalidId')
    isLoading.value = false
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
    const { ticket: next } = await fetchFeedbackTicket(id, token)
    ticket.value = next
  } catch (err) {
    loadError.value = err instanceof ApiError ? err.message : t('feedback.loadError')
  } finally {
    isRefreshing.value = false
    isLoading.value = false
  }
}

async function onReply() {
  const token = auth.accessToken
  const trimmed = replyBody.value.trim()
  if (!token || !trimmed || isSending.value || !canReply.value) {
    return
  }
  isSending.value = true
  sendError.value = ''
  try {
    const { ticket: next } = await replyFeedbackTicket(ticketId.value, token, trimmed)
    ticket.value = next
    replyBody.value = ''
  } catch (err) {
    sendError.value = err instanceof ApiError ? err.message : t('feedback.sendError')
  } finally {
    isSending.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    void loadTicket({ silent: true })
  }, 10000)
}

function stopPolling() {
  if (!pollTimer) {
    return
  }
  clearInterval(pollTimer)
  pollTimer = null
}

watch(
  ticketId,
  () => {
    void loadTicket()
  },
  { immediate: true },
)

onMounted(() => {
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <section class="ui-page-container">
    <NuxtLink :to="localePath('/app/feedback')" class="ui-link-back mb-0! inline-flex">
      {{ $t('feedback.backToList') }}
    </NuxtLink>

    <p v-if="isLoading" class="ui-loading mt-6">{{ $t('common.loading') }}</p>
    <p v-else-if="loadError" class="ui-alert-error mt-6" role="alert">{{ loadError }}</p>

    <template v-else-if="ticket">
      <header class="ui-card mt-4 p-4">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="rounded-md px-2 py-0.5 text-xs font-semibold"
            :class="
              ticket.type === 'bug'
                ? 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100'
                : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
            "
          >
            {{ $t(`feedback.type.${ticket.type}`) }}
          </span>
          <span class="rounded-md bg-(--ui-surface-muted) px-2 py-0.5 text-xs font-medium">
            {{ $t(`feedback.status.${ticket.status}`) }}
          </span>
          <button
            type="button"
            class="ui-btn-sm ui-btn-secondary ml-auto"
            :disabled="isRefreshing"
            @click="loadTicket({ silent: true })"
          >
            {{ isRefreshing ? $t('common.loading') : $t('common.refresh') }}
          </button>
        </div>

        <h1 class="ui-page-title mt-3 text-xl">
          {{ $t('feedback.ticketTitle', { id: ticket.id }) }}
        </h1>
        <p class="ui-caption mt-1">{{ formatIso(ticket.createdAt) }}</p>

        <p class="mt-4 whitespace-pre-wrap text-sm text-stone-800 dark:text-stone-200">
          {{ ticket.message }}
        </p>

        <div
          v-if="ticket.type === 'bug'"
          class="mt-4 rounded-md border border-(--ui-border) bg-(--ui-surface-muted)/40 p-3 text-sm"
        >
          <p class="font-medium">{{ $t('feedback.contextTitle') }}</p>
          <ul class="mt-2 list-none space-y-1 text-stone-600 dark:text-stone-400">
            <li>
              {{ $t('feedback.context.page') }}:
              {{ ticket.pagePath || '—' }}
            </li>
            <li>
              {{ $t('feedback.context.device') }}:
              {{ $t(`feedback.device.${ticket.deviceClass}`) }}
            </li>
            <li>
              {{ $t('feedback.context.os') }}:
              {{ ticket.osLabel || '—' }}
            </li>
            <li>
              {{ $t('feedback.context.browser') }}:
              {{ ticket.browserLabel || '—' }}
            </li>
          </ul>
          <pre
            v-if="ticket.consoleText"
            class="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-stone-900 p-2 text-xs text-stone-100"
          >{{ ticket.consoleText }}</pre>
          <a
            v-if="screenshotSrc"
            :href="screenshotSrc"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-3 block"
          >
            <img
              :src="screenshotSrc"
              :alt="$t('feedback.screenshotAlt')"
              class="max-h-64 rounded-md border border-(--ui-border) object-contain"
            />
          </a>
        </div>
      </header>

      <h2 class="mt-8 text-base font-semibold text-stone-900 dark:text-stone-100">
        {{ $t('feedback.threadTitle') }}
      </h2>

      <ul v-if="ticket.messages.length" class="mt-4 flex list-none flex-col gap-3 p-0">
        <li
          v-for="msg in ticket.messages"
          :key="msg.id"
          class="rounded-lg border border-(--ui-border) bg-(--ui-surface) px-3 py-2 text-sm"
        >
          <p class="text-xs font-semibold text-stone-700 dark:text-stone-300">
            {{ msg.author.displayName }}
            <span v-if="msg.author.isAdmin" class="text-primary-700 dark:text-primary-400">
              · {{ $t('feedback.adminBadge') }}
            </span>
          </p>
          <p class="mt-1 whitespace-pre-wrap text-stone-800 dark:text-stone-200">
            {{ msg.body }}
          </p>
          <p class="mt-1 text-xs text-(--ui-text-muted)">
            {{ formatIso(msg.createdAt) }}
          </p>
        </li>
      </ul>
      <p v-else class="ui-empty mt-4">{{ $t('feedback.noReplies') }}</p>

      <form
        v-if="canReply"
        class="ui-form-stack ui-card mt-6 p-4"
        @submit.prevent="onReply"
      >
        <label class="ui-field">
          {{ $t('feedback.replyLabel') }}
          <textarea
            v-model="replyBody"
            class="ui-textarea"
            rows="3"
            required
            minlength="1"
            maxlength="8000"
            :placeholder="$t('feedback.replyPlaceholder')"
          />
        </label>
        <p v-if="sendError" class="ui-alert-error text-sm" role="alert">{{ sendError }}</p>
        <button
          type="submit"
          class="ui-btn-primary ui-btn-sm"
          :disabled="isSending || !replyBody.trim()"
        >
          {{ isSending ? $t('common.saving') : $t('feedback.reply') }}
        </button>
      </form>
      <p v-else class="ui-caption mt-6">{{ $t('feedback.replyClosed') }}</p>
    </template>
  </section>
</template>
