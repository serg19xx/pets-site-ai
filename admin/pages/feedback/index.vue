<script setup lang="ts">
import { ApiError } from '~/lib/auth'
import {
  fetchFeedbackTickets,
  type FeedbackTicketStatus,
  type FeedbackTicketSummary,
  type FeedbackTicketType,
} from '~/lib/admin-api'

definePageMeta({ middleware: 'admin' })

const auth = useAuthStore()

const tickets = ref<FeedbackTicketSummary[]>([])
const total = ref(0)
const isLoading = ref(true)
const loadError = ref('')
const typeFilter = ref<'all' | FeedbackTicketType>('all')
const statusFilter = ref<'all' | FeedbackTicketStatus>('all')

const filtered = computed(() => {
  return tickets.value.filter((item) => {
    if (typeFilter.value !== 'all' && item.type !== typeFilter.value) {
      return false
    }
    if (statusFilter.value !== 'all' && item.status !== statusFilter.value) {
      return false
    }
    return true
  })
})

function preview(message: string): string {
  const trimmed = message.trim()
  return trimmed.length <= 140 ? trimmed : `${trimmed.slice(0, 137)}…`
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

async function loadTickets() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const result = await fetchFeedbackTickets(token, { limit: 50 })
    tickets.value = result.tickets
    total.value = result.total
  } catch (err) {
    loadError.value = err instanceof ApiError ? err.message : 'Could not load feedback.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadTickets()
})
</script>

<template>
  <section>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-zinc-900">Feedback</h1>
        <p class="mt-1 text-sm text-zinc-600">
          Bugs and improvements from beta testers · {{ total }} total
        </p>
      </div>
      <button
        type="button"
        class="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
        @click="loadTickets"
      >
        Refresh
      </button>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <select v-model="typeFilter" class="rounded border border-zinc-300 px-2 py-1.5 text-sm">
        <option value="all">All types</option>
        <option value="bug">Bug</option>
        <option value="improvement">Improvement</option>
      </select>
      <select v-model="statusFilter" class="rounded border border-zinc-300 px-2 py-1.5 text-sm">
        <option value="all">All statuses</option>
        <option value="open">Open</option>
        <option value="closed">Closed</option>
      </select>
    </div>

    <p v-if="isLoading" class="mt-6 text-sm text-zinc-500">Loading…</p>
    <p v-else-if="loadError" class="mt-6 text-sm text-red-700" role="alert">{{ loadError }}</p>
    <p v-else-if="filtered.length === 0" class="mt-6 text-sm text-zinc-500">No tickets.</p>

    <ul v-else class="mt-6 flex list-none flex-col gap-2 p-0">
      <li v-for="item in filtered" :key="item.id">
        <NuxtLink
          :to="`/feedback/${item.id}`"
          class="block rounded-lg border border-zinc-200 bg-white p-4 hover:border-teal-300"
        >
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span
              class="rounded px-2 py-0.5 font-semibold"
              :class="
                item.type === 'bug'
                  ? 'bg-rose-100 text-rose-900'
                  : 'bg-emerald-100 text-emerald-900'
              "
            >
              {{ item.type }}
            </span>
            <span class="rounded bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">
              {{ item.status }}
            </span>
            <span class="ml-auto text-zinc-500">{{ formatTime(item.createdAt) }}</span>
          </div>
          <p class="mt-2 text-sm text-zinc-800">{{ preview(item.message) }}</p>
          <p class="mt-2 text-xs text-zinc-500">
            {{ item.author.displayName }} · {{ item.author.email }}
            <span v-if="item.messageCount"> · {{ item.messageCount }} replies</span>
          </p>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
