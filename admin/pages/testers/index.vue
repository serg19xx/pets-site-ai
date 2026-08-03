<script setup lang="ts">
import { ApiError } from '~/lib/auth'
import { fetchBetaTesterStats, type BetaTesterStatsRow } from '~/lib/admin-api'

definePageMeta({ middleware: 'admin' })

const auth = useAuthStore()

const testers = ref<BetaTesterStatsRow[]>([])
const isLoading = ref(true)
const loadError = ref('')

function score(row: BetaTesterStatsRow): number {
  return row.bugCount + row.acceptedImprovementCount
}

async function load() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const data = await fetchBetaTesterStats(token)
    testers.value = data.testers
  } catch (err) {
    loadError.value = err instanceof ApiError ? err.message : 'Could not load testers.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section>
    <h1 class="text-xl font-semibold text-zinc-900">Tester activity</h1>
    <p class="mt-1 text-sm text-zinc-600">
      Bonus shortlist: bugs filed + improvements accepted into work. Rejected ideas do not count.
    </p>

    <p v-if="isLoading" class="mt-6 text-sm text-zinc-500">Loading…</p>
    <p v-else-if="loadError" class="mt-6 text-sm text-red-700" role="alert">{{ loadError }}</p>

    <div v-else class="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th class="px-3 py-2 font-medium">Tester</th>
            <th class="px-3 py-2 font-medium">Bugs</th>
            <th class="px-3 py-2 font-medium">Accepted</th>
            <th class="px-3 py-2 font-medium">Pending</th>
            <th class="px-3 py-2 font-medium">Rejected</th>
            <th class="px-3 py-2 font-medium">Score</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in testers"
            :key="row.id"
            class="border-b border-zinc-100 last:border-0"
          >
            <td class="px-3 py-2">
              <p class="font-medium text-zinc-900">{{ row.displayName }}</p>
              <p class="text-xs text-zinc-500">{{ row.email }}</p>
            </td>
            <td class="px-3 py-2 tabular-nums">{{ row.bugCount }}</td>
            <td class="px-3 py-2 tabular-nums text-emerald-800">
              {{ row.acceptedImprovementCount }}
            </td>
            <td class="px-3 py-2 tabular-nums text-zinc-500">
              {{ row.pendingImprovementCount }}
            </td>
            <td class="px-3 py-2 tabular-nums text-zinc-500">
              {{ row.rejectedImprovementCount }}
            </td>
            <td class="px-3 py-2 font-semibold tabular-nums">{{ score(row) }}</td>
          </tr>
          <tr v-if="!testers.length">
            <td colspan="6" class="px-3 py-6 text-center text-zinc-500">
              No beta testers yet.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
