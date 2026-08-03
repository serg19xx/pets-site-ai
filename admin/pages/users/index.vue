<script setup lang="ts">
import { ApiError } from '~/lib/auth'
import {
  deleteAdminUser,
  fetchAdminUsers,
  type AdminUserRow,
} from '~/lib/admin-api'

definePageMeta({ middleware: 'admin' })

const auth = useAuthStore()

const users = ref<AdminUserRow[]>([])
const total = ref(0)
const query = ref('')
const isLoading = ref(true)
const loadError = ref('')
const actionError = ref('')
const deletingId = ref<number | null>(null)

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function canDelete(user: AdminUserRow): boolean {
  if (user.isAdmin) {
    return false
  }
  if (auth.user?.id === user.id) {
    return false
  }
  return true
}

async function loadUsers() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const result = await fetchAdminUsers(token, {
      limit: 100,
      q: query.value.trim() || undefined,
    })
    users.value = result.users
    total.value = result.total
  } catch (err) {
    loadError.value = err instanceof ApiError ? err.message : 'Could not load users.'
  } finally {
    isLoading.value = false
  }
}

async function onDelete(user: AdminUserRow) {
  const token = auth.accessToken
  if (!token || !canDelete(user) || deletingId.value !== null) {
    return
  }
  const ok = window.confirm(
    `Delete ${user.displayName} (${user.email}) permanently?\n\nAll related data (pets, posts, listings, feedback, uploads) will be removed.`,
  )
  if (!ok) {
    return
  }
  deletingId.value = user.id
  actionError.value = ''
  try {
    await deleteAdminUser(user.id, token)
    users.value = users.value.filter((row) => row.id !== user.id)
    total.value = Math.max(0, total.value - 1)
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : 'Could not delete user.'
  } finally {
    deletingId.value = null
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(query, () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    void loadUsers()
  }, 300)
})

onMounted(() => {
  void loadUsers()
})
</script>

<template>
  <section>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-zinc-900">Users</h1>
        <p class="mt-1 text-sm text-zinc-600">{{ total }} registered accounts</p>
      </div>
      <input
        v-model="query"
        type="search"
        placeholder="Search name or email…"
        class="w-full max-w-xs rounded border border-zinc-300 px-3 py-1.5 text-sm sm:w-64"
      />
    </div>

    <p v-if="isLoading" class="mt-6 text-sm text-zinc-500">Loading…</p>
    <p v-else-if="loadError" class="mt-6 text-sm text-red-700" role="alert">{{ loadError }}</p>
    <p v-else-if="actionError" class="mt-4 text-sm text-red-700" role="alert">{{ actionError }}</p>

    <div v-if="!isLoading && !loadError" class="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
          <tr>
            <th class="px-3 py-2 font-medium">ID</th>
            <th class="px-3 py-2 font-medium">Name</th>
            <th class="px-3 py-2 font-medium">Email</th>
            <th class="px-3 py-2 font-medium">Flags</th>
            <th class="px-3 py-2 font-medium">Joined</th>
            <th class="px-3 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in users"
            :key="user.id"
            class="border-b border-zinc-100 last:border-0"
          >
            <td class="px-3 py-2 text-zinc-500">{{ user.id }}</td>
            <td class="px-3 py-2">{{ user.displayName }}</td>
            <td class="px-3 py-2">{{ user.email }}</td>
            <td class="px-3 py-2">
              <span
                v-if="user.isAdmin"
                class="mr-1 rounded bg-teal-100 px-1.5 py-0.5 text-xs font-medium text-teal-900"
              >
                admin
              </span>
              <span
                v-if="user.isBetaTester"
                class="mr-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900"
              >
                beta
              </span>
              <span
                v-if="!user.emailVerified"
                class="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600"
              >
                unverified
              </span>
            </td>
            <td class="px-3 py-2 text-zinc-500">{{ formatTime(user.createdAt) }}</td>
            <td class="px-3 py-2">
              <div class="flex items-center justify-end gap-1">
                <!-- Future: ban / suspend / email / SMS / call -->
                <button
                  type="button"
                  class="inline-flex size-8 items-center justify-center rounded text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                  :title="canDelete(user) ? 'Delete user' : 'Cannot delete admin or yourself'"
                  :aria-label="`Delete ${user.displayName}`"
                  :disabled="!canDelete(user) || deletingId === user.id"
                  @click="onDelete(user)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.75"
                    class="size-4"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3 6h18M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6m2 0v13.5A1.5 1.5 0 0 1 16.5 21h-9A1.5 1.5 0 0 1 6 19.5V6m3 4.5v7m6-7v7"
                    />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
