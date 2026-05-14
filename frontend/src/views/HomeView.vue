<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { apiBaseUrl, apiUrl } from '@/lib/api'
import { useAppStore } from '@/stores/app'

const app = useAppStore()

const apiHealth = ref<'idle' | 'loading' | 'ok' | 'error'>('idle')
const apiHealthMessage = ref<string>('')

const dbHealth = ref<'idle' | 'loading' | 'ok' | 'error'>('idle')
const dbHealthMessage = ref<string>('')

async function checkApi() {
  apiHealth.value = 'loading'
  apiHealthMessage.value = ''
  try {
    const response = await fetch(apiUrl('/api/health'))
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const body: unknown = await response.json()
    apiHealth.value = 'ok'
    apiHealthMessage.value = JSON.stringify(body)
  } catch (error) {
    apiHealth.value = 'error'
    apiHealthMessage.value = error instanceof Error ? error.message : 'Unknown error'
  }
}

async function checkDb() {
  dbHealth.value = 'loading'
  dbHealthMessage.value = ''
  try {
    const response = await fetch(apiUrl('/api/health/db'))
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const body: unknown = await response.json()
    dbHealth.value = 'ok'
    dbHealthMessage.value = JSON.stringify(body)
  } catch (error) {
    dbHealth.value = 'error'
    dbHealthMessage.value = error instanceof Error ? error.message : 'Unknown error'
  }
}

onMounted(() => {
  void checkApi()
  void checkDb()
})
</script>

<template>
  <div
    class="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-50 px-4 py-10 text-slate-800 dark:bg-slate-900 dark:text-slate-100"
  >
    <div class="flex flex-col items-center gap-2 text-center">
      <h1 class="text-3xl font-semibold tracking-tight">{{ app.appName }}</h1>
      <p class="max-w-lg text-sm text-slate-600 dark:text-slate-400">
        API base:
        <code class="rounded bg-slate-200 px-1.5 py-0.5 text-xs dark:bg-slate-800">{{
          apiBaseUrl || '(same-origin / Vite proxy)'
        }}</code>
      </p>
    </div>

    <div class="flex w-full max-w-lg flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 text-left text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div class="flex items-center justify-between gap-2">
        <span class="font-medium">GET /api/health</span>
        <span
          class="rounded-full px-2 py-0.5 text-xs font-medium"
          :class="{
            'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200': apiHealth === 'idle',
            'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100': apiHealth === 'loading',
            'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100': apiHealth === 'ok',
            'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100': apiHealth === 'error',
          }"
        >
          {{ apiHealth }}
        </span>
      </div>
      <p v-if="apiHealthMessage" class="break-all font-mono text-xs text-slate-600 dark:text-slate-400">
        {{ apiHealthMessage }}
      </p>
      <button
        type="button"
        class="self-start rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        @click="checkApi"
      >
        Retry API
      </button>

      <hr class="border-slate-200 dark:border-slate-800" />

      <div class="flex items-center justify-between gap-2">
        <span class="font-medium">GET /api/health/db</span>
        <span
          class="rounded-full px-2 py-0.5 text-xs font-medium"
          :class="{
            'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200': dbHealth === 'idle',
            'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100': dbHealth === 'loading',
            'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100': dbHealth === 'ok',
            'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100': dbHealth === 'error',
          }"
        >
          {{ dbHealth }}
        </span>
      </div>
      <p v-if="dbHealthMessage" class="break-all font-mono text-xs text-slate-600 dark:text-slate-400">
        {{ dbHealthMessage }}
      </p>
      <button
        type="button"
        class="self-start rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        @click="checkDb"
      >
        Retry DB
      </button>
    </div>
  </div>
</template>
