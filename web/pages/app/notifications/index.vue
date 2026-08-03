<script setup lang="ts">
import { ApiError } from '~/lib/auth-api'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '~/lib/notifications-api'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()

usePageSeo({
  title: () => t('notifications.metaTitle'),
  description: () => t('notifications.metaDescription'),
})

const items = ref<AppNotification[]>([])
const unreadCount = ref(0)
const isLoading = ref(true)
const loadError = ref('')
const isMarkingAll = ref(false)

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function resolveLink(path: string | null): string | null {
  if (!path) {
    return null
  }
  return localePath(path)
}

async function load() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const data = await fetchNotifications(token, { limit: 50 })
    items.value = data.notifications
    unreadCount.value = data.unreadCount
  } catch (err) {
    loadError.value =
      err instanceof ApiError ? err.message : t('notifications.loadError')
  } finally {
    isLoading.value = false
  }
}

async function onOpen(item: AppNotification) {
  const token = auth.accessToken
  if (!token) {
    return
  }
  if (!item.readAt) {
    try {
      await markNotificationRead(item.id, token)
      item.readAt = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch {
      // still navigate
    }
  }
  const to = resolveLink(item.linkPath)
  if (to) {
    await navigateTo(to)
  }
}

async function onMarkAll() {
  const token = auth.accessToken
  if (!token || isMarkingAll.value) {
    return
  }
  isMarkingAll.value = true
  try {
    await markAllNotificationsRead(token)
    for (const item of items.value) {
      if (!item.readAt) {
        item.readAt = new Date().toISOString()
      }
    }
    unreadCount.value = 0
  } finally {
    isMarkingAll.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="ui-page">
    <header class="ui-page-header flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="ui-page-title">{{ $t('notifications.title') }}</h1>
        <p class="ui-page-subtitle">{{ $t('notifications.subtitle') }}</p>
      </div>
      <button
        v-if="unreadCount > 0"
        type="button"
        class="ui-btn-secondary ui-btn-sm"
        :disabled="isMarkingAll"
        @click="onMarkAll"
      >
        {{ $t('notifications.markAllRead') }}
      </button>
    </header>

    <p v-if="isLoading" class="mt-6 text-sm text-muted">{{ $t('notifications.loading') }}</p>
    <p v-else-if="loadError" class="mt-6 text-sm text-danger" role="alert">{{ loadError }}</p>

    <ul v-else-if="items.length" class="mt-6 list-none space-y-3 p-0">
      <li
        v-for="item in items"
        :key="item.id"
      >
        <button
          type="button"
          class="w-full rounded-lg border px-4 py-3 text-left transition"
          :class="
            item.readAt
              ? 'border-border bg-surface text-fg'
              : 'border-primary-200 bg-primary-50/60 text-fg'
          "
          @click="onOpen(item)"
        >
          <div class="flex items-start justify-between gap-3">
            <p class="text-sm font-semibold">{{ item.title }}</p>
            <span
              v-if="!item.readAt"
              class="mt-0.5 inline-block size-2 shrink-0 rounded-full bg-primary-600"
              aria-hidden="true"
            />
          </div>
          <p class="mt-1 whitespace-pre-wrap text-sm text-muted">{{ item.body }}</p>
          <p class="mt-2 text-xs text-muted">{{ formatTime(item.createdAt) }}</p>
        </button>
      </li>
    </ul>
    <p v-else class="mt-6 text-sm text-muted">{{ $t('notifications.empty') }}</p>
  </section>
</template>
