<script setup lang="ts">
import { ApiError } from '~/lib/auth'
import {
  fetchAdminSpecies,
  setAdminSpeciesActive,
  type AdminSpeciesRow,
} from '~/lib/admin-api'

definePageMeta({ middleware: 'admin' })

const auth = useAuthStore()

const species = ref<AdminSpeciesRow[]>([])
const isLoading = ref(true)
const loadError = ref('')
const actionError = ref('')
const pendingId = ref<number | null>(null)

async function load() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const data = await fetchAdminSpecies(token)
    species.value = data.species
  } catch (err) {
    loadError.value = err instanceof ApiError ? err.message : 'Could not load species.'
  } finally {
    isLoading.value = false
  }
}

async function toggle(row: AdminSpeciesRow, next: boolean) {
  const token = auth.accessToken
  if (!token) {
    return
  }
  pendingId.value = row.id
  actionError.value = ''
  const prev = row.isActive
  row.isActive = next
  try {
    const { species: updated } = await setAdminSpeciesActive(row.id, next, token)
    const idx = species.value.findIndex((s) => s.id === updated.id)
    if (idx >= 0) {
      species.value[idx] = updated
    }
  } catch (err) {
    row.isActive = prev
    actionError.value =
      err instanceof ApiError ? err.message : 'Could not update species.'
  } finally {
    pendingId.value = null
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section>
    <h1 class="text-xl font-semibold text-zinc-900">Species catalog</h1>
    <p class="mt-1 text-sm text-zinc-600">
      Toggle which animals appear in Create pet / species pickers. Existing pets keep their
      species even when disabled.
    </p>

    <p v-if="isLoading" class="mt-6 text-sm text-zinc-500">Loading…</p>
    <p v-else-if="loadError" class="mt-6 text-sm text-red-700" role="alert">{{ loadError }}</p>
    <p v-if="actionError" class="mt-4 text-sm text-red-700" role="alert">{{ actionError }}</p>

    <div v-else class="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th class="px-3 py-2 font-medium">Species</th>
            <th class="px-3 py-2 font-medium">Slug</th>
            <th class="px-3 py-2 font-medium">Pets</th>
            <th class="px-3 py-2 font-medium">Available</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in species"
            :key="row.id"
            class="border-b border-zinc-100 last:border-0"
          >
            <td class="px-3 py-2 font-medium text-zinc-900">{{ row.label }}</td>
            <td class="px-3 py-2 font-mono text-xs text-zinc-500">{{ row.slug }}</td>
            <td class="px-3 py-2 tabular-nums text-zinc-700">{{ row.petCount }}</td>
            <td class="px-3 py-2">
              <label class="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  class="size-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                  :checked="row.isActive"
                  :disabled="pendingId === row.id"
                  @change="toggle(row, ($event.target as HTMLInputElement).checked)"
                />
                <span class="text-xs" :class="row.isActive ? 'text-emerald-800' : 'text-zinc-500'">
                  {{ row.isActive ? 'On' : 'Off' }}
                </span>
              </label>
            </td>
          </tr>
          <tr v-if="!species.length">
            <td colspan="4" class="px-3 py-6 text-center text-zinc-500">No species found.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
