<script setup lang="ts">
import { ApiError } from '~/lib/auth'
import {
  createBetaAnnouncement,
  fetchBetaAnnouncements,
  type BetaAnnouncementRow,
} from '~/lib/admin-api'

definePageMeta({ middleware: 'admin' })

const auth = useAuthStore()

const announcements = ref<BetaAnnouncementRow[]>([])
const isLoading = ref(true)
const loadError = ref('')
const title = ref('')
const body = ref('')
const linkPath = ref('')
const isSending = ref(false)
const sendError = ref('')
const sendSuccess = ref('')

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

async function loadList() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const data = await fetchBetaAnnouncements(token)
    announcements.value = data.announcements
  } catch (err) {
    loadError.value = err instanceof ApiError ? err.message : 'Could not load announcements.'
  } finally {
    isLoading.value = false
  }
}

async function onSubmit() {
  const token = auth.accessToken
  if (!token || isSending.value) {
    return
  }
  isSending.value = true
  sendError.value = ''
  sendSuccess.value = ''
  try {
    const { announcement } = await createBetaAnnouncement(token, {
      title: title.value.trim(),
      body: body.value.trim(),
      linkPath: linkPath.value.trim() || null,
    })
    sendSuccess.value = `Sent to ${announcement.recipientCount ?? 0} beta tester(s).`
    title.value = ''
    body.value = ''
    linkPath.value = ''
    await loadList()
  } catch (err) {
    sendError.value = err instanceof ApiError ? err.message : 'Could not send announcement.'
  } finally {
    isSending.value = false
  }
}

onMounted(() => {
  void loadList()
})
</script>

<template>
  <section>
    <h1 class="text-xl font-semibold text-zinc-900">Announce to testers</h1>
    <p class="mt-1 text-sm text-zinc-600">
      In-app notification + email for every founding beta tester. Ask them to try a new feature.
    </p>

    <form
      class="mt-6 max-w-xl space-y-3 rounded-lg border border-zinc-200 bg-white p-4"
      @submit.prevent="onSubmit"
    >
      <label class="flex flex-col gap-1 text-sm">
        Title
        <input
          v-model="title"
          type="text"
          required
          minlength="3"
          maxlength="200"
          class="rounded border border-zinc-300 px-3 py-2"
          placeholder="New: virtual pets draft"
        />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        Message
        <textarea
          v-model="body"
          rows="5"
          required
          minlength="3"
          maxlength="8000"
          class="rounded border border-zinc-300 px-3 py-2"
          placeholder="What changed, where to look, what to test…"
        />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        Link path (optional)
        <input
          v-model="linkPath"
          type="text"
          maxlength="500"
          class="rounded border border-zinc-300 px-3 py-2 font-mono text-xs"
          placeholder="/app/my-pets/new"
        />
      </label>
      <p v-if="sendError" class="text-sm text-red-700" role="alert">{{ sendError }}</p>
      <p v-if="sendSuccess" class="text-sm text-emerald-700" role="status">{{ sendSuccess }}</p>
      <button
        type="submit"
        class="rounded bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        :disabled="isSending || title.trim().length < 3 || body.trim().length < 3"
      >
        {{ isSending ? 'Sending…' : 'Send to all testers' }}
      </button>
    </form>

    <h2 class="mt-10 text-base font-semibold">Recent announces</h2>
    <p v-if="isLoading" class="mt-3 text-sm text-zinc-500">Loading…</p>
    <p v-else-if="loadError" class="mt-3 text-sm text-red-700" role="alert">{{ loadError }}</p>
    <ul v-else-if="announcements.length" class="mt-3 list-none space-y-3 p-0">
      <li
        v-for="item in announcements"
        :key="item.id"
        class="rounded-lg border border-zinc-200 bg-white p-3"
      >
        <p class="text-sm font-semibold text-zinc-900">{{ item.title }}</p>
        <p class="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{{ item.body }}</p>
        <p class="mt-2 text-xs text-zinc-500">
          {{ formatTime(item.createdAt) }}
          <span v-if="item.linkPath"> · {{ item.linkPath }}</span>
        </p>
      </li>
    </ul>
    <p v-else class="mt-3 text-sm text-zinc-500">No announcements yet.</p>
  </section>
</template>
