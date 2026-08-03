<script setup lang="ts">
import { ApiError } from '~/lib/auth'
import {
  decideFeedbackImprovement,
  fetchFeedbackTicket,
  mediaUrl,
  replyFeedbackTicket,
  updateFeedbackTicketStatus,
  type FeedbackTicketDetail,
  type FeedbackTicketStatus,
} from '~/lib/admin-api'

definePageMeta({ middleware: 'admin' })

const auth = useAuthStore()
const route = useRoute()

const ticketId = computed(() => Number(route.params.id))
const ticket = ref<FeedbackTicketDetail | null>(null)
const isLoading = ref(true)
const loadError = ref('')
const replyBody = ref('')
const isSending = ref(false)
const sendError = ref('')
const isUpdatingStatus = ref(false)

const decisionNote = ref('')
const isDeciding = ref(false)

const statuses: FeedbackTicketStatus[] = ['open', 'closed']

const screenshotSrc = computed(() => mediaUrl(ticket.value?.screenshotUrl))

const canReply = computed(() => ticket.value?.status === 'open')

const canDecideImprovement = computed(
  () =>
    ticket.value?.type === 'improvement' &&
    ticket.value.improvementDecision === 'pending',
)

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

async function loadTicket() {
  const token = auth.accessToken
  const id = ticketId.value
  if (!token || !Number.isInteger(id) || id < 1) {
    loadError.value = 'Invalid ticket id'
    isLoading.value = false
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const { ticket: next } = await fetchFeedbackTicket(id, token)
    ticket.value = next
  } catch (err) {
    loadError.value = err instanceof ApiError ? err.message : 'Could not load ticket.'
  } finally {
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
    sendError.value = err instanceof ApiError ? err.message : 'Could not send reply.'
  } finally {
    isSending.value = false
  }
}

async function onStatusChange(event: Event) {
  const token = auth.accessToken
  const select = event.target as HTMLSelectElement
  const status = select.value as FeedbackTicketStatus
  if (!token || isUpdatingStatus.value) {
    return
  }
  isUpdatingStatus.value = true
  try {
    const { ticket: next } = await updateFeedbackTicketStatus(
      ticketId.value,
      token,
      status,
    )
    ticket.value = next
  } catch (err) {
    sendError.value = err instanceof ApiError ? err.message : 'Could not update status.'
    if (ticket.value) {
      select.value = ticket.value.status
    }
  } finally {
    isUpdatingStatus.value = false
  }
}

async function onDecide(decision: 'accepted' | 'rejected') {
  const token = auth.accessToken
  const note = decisionNote.value.trim()
  if (!token || !note || isDeciding.value || !canDecideImprovement.value) {
    return
  }
  isDeciding.value = true
  sendError.value = ''
  try {
    const { ticket: next } = await decideFeedbackImprovement(
      ticketId.value,
      token,
      decision,
      note,
    )
    ticket.value = next
    decisionNote.value = ''
  } catch (err) {
    sendError.value = err instanceof ApiError ? err.message : 'Could not save decision.'
  } finally {
    isDeciding.value = false
  }
}

watch(ticketId, () => {
  void loadTicket()
}, { immediate: true })
</script>

<template>
  <section>
    <NuxtLink to="/feedback" class="text-sm text-teal-700 hover:underline">
      ← Back to inbox
    </NuxtLink>

    <p v-if="isLoading" class="mt-6 text-sm text-zinc-500">Loading…</p>
    <p v-else-if="loadError" class="mt-6 text-sm text-red-700" role="alert">{{ loadError }}</p>

    <template v-else-if="ticket">
      <header class="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="rounded px-2 py-0.5 text-xs font-semibold"
            :class="
              ticket.type === 'bug'
                ? 'bg-rose-100 text-rose-900'
                : 'bg-emerald-100 text-emerald-900'
            "
          >
            {{ ticket.type }}
          </span>
          <span
            v-if="ticket.improvementDecision"
            class="rounded px-2 py-0.5 text-xs font-semibold"
            :class="{
              'bg-amber-100 text-amber-900': ticket.improvementDecision === 'pending',
              'bg-emerald-100 text-emerald-900': ticket.improvementDecision === 'accepted',
              'bg-zinc-200 text-zinc-700': ticket.improvementDecision === 'rejected',
            }"
          >
            {{ ticket.improvementDecision }}
          </span>
          <label class="inline-flex items-center gap-2 text-xs font-medium text-zinc-700">
            Status
            <select
              class="rounded border border-zinc-300 px-2 py-1"
              :value="ticket.status"
              :disabled="isUpdatingStatus"
              @change="onStatusChange"
            >
              <option v-for="status in statuses" :key="status" :value="status">
                {{ status }}
              </option>
            </select>
          </label>
        </div>
        <h1 class="mt-3 text-xl font-semibold">Feedback #{{ ticket.id }}</h1>
        <p class="mt-1 text-sm text-zinc-600">
          {{ ticket.author.displayName }} · {{ ticket.author.email }}
        </p>
        <p class="mt-1 text-xs text-zinc-500">{{ formatTime(ticket.createdAt) }}</p>
        <p class="mt-4 whitespace-pre-wrap text-sm text-zinc-800">{{ ticket.message }}</p>

        <p
          v-if="ticket.decisionNote"
          class="mt-4 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700"
        >
          <span class="font-medium">Decision note:</span>
          {{ ticket.decisionNote }}
        </p>

        <div
          v-if="ticket.type === 'bug'"
          class="mt-4 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm"
        >
          <p class="font-medium">Environment</p>
          <ul class="mt-2 list-none space-y-1 p-0 text-zinc-600">
            <li>Page: {{ ticket.pagePath || '—' }}</li>
            <li>Device: {{ ticket.deviceClass }}</li>
            <li>OS: {{ ticket.osLabel || '—' }}</li>
            <li>Browser: {{ ticket.browserLabel || '—' }}</li>
            <li v-if="ticket.userAgent" class="break-all font-mono text-xs">
              UA: {{ ticket.userAgent }}
            </li>
          </ul>
          <pre
            v-if="ticket.consoleText"
            class="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-zinc-900 p-2 text-xs text-zinc-100"
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
              alt="Bug screenshot"
              class="max-h-64 rounded border border-zinc-200 object-contain"
            />
          </a>
        </div>
      </header>

      <form
        v-if="canDecideImprovement"
        class="mt-6 rounded-lg border border-teal-200 bg-teal-50/40 p-4"
        @submit.prevent
      >
        <h2 class="text-base font-semibold text-zinc-900">Accept or reject improvement</h2>
        <p class="mt-1 text-sm text-zinc-600">
          Explain why — the tester gets this note in-app and by email. Only accepted ideas count
          toward bonus activity.
        </p>
        <label class="mt-3 flex flex-col gap-1 text-sm">
          Reason
          <textarea
            v-model="decisionNote"
            rows="3"
            required
            minlength="3"
            class="rounded border border-zinc-300 bg-white px-3 py-2"
            placeholder="Already planned, but your angle is stronger — accepting… / Already shipped as X — rejecting…"
          />
        </label>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            :disabled="isDeciding || decisionNote.trim().length < 3"
            @click="onDecide('accepted')"
          >
            Accept into work
          </button>
          <button
            type="button"
            class="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
            :disabled="isDeciding || decisionNote.trim().length < 3"
            @click="onDecide('rejected')"
          >
            Reject
          </button>
        </div>
      </form>

      <h2 class="mt-8 text-base font-semibold">Conversation</h2>
      <ul v-if="ticket.messages.length" class="mt-3 flex list-none flex-col gap-3 p-0">
        <li
          v-for="msg in ticket.messages"
          :key="msg.id"
          class="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
        >
          <p class="text-xs font-semibold text-zinc-700">
            {{ msg.author.displayName }}
            <span v-if="msg.author.isAdmin" class="text-teal-700"> · team</span>
          </p>
          <p class="mt-1 whitespace-pre-wrap text-zinc-800">{{ msg.body }}</p>
          <p class="mt-1 text-xs text-zinc-500">{{ formatTime(msg.createdAt) }}</p>
        </li>
      </ul>
      <p v-else class="mt-3 text-sm text-zinc-500">No replies yet.</p>

      <form
        v-if="canReply"
        class="mt-6 rounded-lg border border-zinc-200 bg-white p-4"
        @submit.prevent="onReply"
      >
        <label class="flex flex-col gap-1 text-sm">
          Reply
          <textarea
            v-model="replyBody"
            rows="3"
            required
            class="rounded border border-zinc-300 px-3 py-2"
            placeholder="Write a reply…"
          />
        </label>
        <p v-if="sendError" class="mt-2 text-sm text-red-700" role="alert">{{ sendError }}</p>
        <button
          type="submit"
          class="mt-3 rounded bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          :disabled="isSending || !replyBody.trim()"
        >
          {{ isSending ? 'Sending…' : 'Send reply' }}
        </button>
      </form>
      <p v-else class="mt-6 text-sm text-zinc-500">
        This ticket is closed. Set status to open to reply again.
      </p>
      <p v-if="sendError && !canReply" class="mt-2 text-sm text-red-700" role="alert">
        {{ sendError }}
      </p>
    </template>
  </section>
</template>
