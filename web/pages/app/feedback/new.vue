<script setup lang="ts">
import { ApiError } from '~/lib/auth-api'
import { createFeedbackTicket, fetchFeedbackAccess } from '~/lib/feedback-api'
import { collectClientFeedbackContext } from '~/lib/feedback-context'
import { useAuthStore } from '~/stores/auth'
import type { FeedbackTicketType } from '~/types/feedback'

definePageMeta({
  layout: 'app',
  middleware: ['auth', 'block-admin'],
  ssr: false,
})

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()

const type = ref<FeedbackTicketType>('bug')
const message = ref('')
const consoleText = ref('')
const screenshotFile = ref<File | null>(null)
const screenshotPreview = ref<string | null>(null)
const contextLines = ref<string[]>([])
const isChecking = ref(true)
const forbidden = ref(false)
const isSending = ref(false)
const sendError = ref('')

/** Prefer the page the user came from (FAB), not the feedback form URL. */
function resolvePagePath(fallbackPath: string): string {
  const from = route.query.from
  if (typeof from === 'string' && from.startsWith('/') && !from.includes('/app/feedback')) {
    return from
  }
  return fallbackPath
}

const context = computed(() => {
  if (!import.meta.client) {
    return null
  }
  const base = collectClientFeedbackContext()
  return {
    ...base,
    pagePath: resolvePagePath(base.pagePath),
  }
})

watch(
  context,
  (ctx) => {
    if (!ctx) {
      contextLines.value = []
      return
    }
    contextLines.value = [
      `${t('feedback.context.page')}: ${ctx.pagePath || '—'}`,
      `${t('feedback.context.device')}: ${t(`feedback.device.${ctx.deviceClass}`)}`,
      `${t('feedback.context.os')}: ${ctx.osLabel}`,
      `${t('feedback.context.browser')}: ${ctx.browserLabel}`,
    ]
  },
  { immediate: true },
)

onMounted(async () => {
  const token = auth.accessToken
  if (!token) {
    isChecking.value = false
    return
  }
  try {
    const access = await fetchFeedbackAccess(token)
    if (!access.isBetaTester) {
      forbidden.value = true
    }
  } catch (err) {
    sendError.value = err instanceof ApiError ? err.message : t('feedback.loadError')
  } finally {
    isChecking.value = false
  }
})

function onScreenshotChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (screenshotPreview.value) {
    URL.revokeObjectURL(screenshotPreview.value)
  }
  screenshotFile.value = file
  screenshotPreview.value = file ? URL.createObjectURL(file) : null
}

onUnmounted(() => {
  if (screenshotPreview.value) {
    URL.revokeObjectURL(screenshotPreview.value)
  }
})

async function onSubmit() {
  const token = auth.accessToken
  const trimmed = message.value.trim()
  if (!token || !trimmed || isSending.value || forbidden.value) {
    return
  }
  isSending.value = true
  sendError.value = ''
  try {
    const ctx = collectClientFeedbackContext()
    const pagePath = resolvePagePath(ctx.pagePath)
    const { ticket } = await createFeedbackTicket(token, {
      type: type.value,
      message: trimmed,
      ...(type.value === 'bug'
        ? {
            pagePath,
            userAgent: ctx.userAgent,
            deviceClass: ctx.deviceClass,
            osLabel: ctx.osLabel,
            browserLabel: ctx.browserLabel,
            consoleText: consoleText.value.trim() || null,
            screenshot: screenshotFile.value,
          }
        : {}),
    })
    isSending.value = false
    await navigateTo(localePath(`/app/feedback/${ticket.id}`))
  } catch (err) {
    sendError.value = err instanceof ApiError ? err.message : t('feedback.sendError')
    isSending.value = false
  }
}
</script>

<template>
  <section class="ui-page-container">
    <NuxtLink :to="localePath('/app/feedback')" class="ui-link-back mb-0! inline-flex">
      {{ $t('feedback.backToList') }}
    </NuxtLink>

    <h1 class="ui-page-title mt-4">{{ $t('feedback.newTitle') }}</h1>
    <p class="ui-page-subtitle mt-2">{{ $t('feedback.newSubtitle') }}</p>

    <p v-if="isChecking" class="ui-loading mt-6">{{ $t('common.loading') }}</p>
    <p v-else-if="forbidden" class="ui-alert-error mt-6" role="alert">
      {{ $t('feedback.betaOnly') }}
    </p>

    <form v-else class="ui-form-stack ui-card mt-6 p-4" @submit.prevent="onSubmit">
      <fieldset class="flex flex-wrap gap-2">
        <legend class="mb-2 text-sm font-medium text-stone-800 dark:text-stone-200">
          {{ $t('feedback.typeLabel') }}
        </legend>
        <button
          type="button"
          class="ui-btn-sm"
          :class="type === 'bug' ? 'ui-btn-primary' : 'ui-btn-secondary'"
          @click="type = 'bug'"
        >
          {{ $t('feedback.type.bug') }}
        </button>
        <button
          type="button"
          class="ui-btn-sm"
          :class="type === 'improvement' ? 'ui-btn-primary' : 'ui-btn-secondary'"
          @click="type = 'improvement'"
        >
          {{ $t('feedback.type.improvement') }}
        </button>
      </fieldset>

      <p class="text-sm text-stone-600 dark:text-stone-400">
        {{
          type === 'bug'
            ? $t('feedback.bugHint')
            : $t('feedback.improvementHint')
        }}
      </p>

      <label class="ui-field">
        {{ $t('feedback.messageLabel') }}
        <textarea
          v-model="message"
          class="ui-textarea"
          rows="5"
          required
          minlength="3"
          maxlength="8000"
          :placeholder="
            type === 'bug'
              ? $t('feedback.bugPlaceholder')
              : $t('feedback.improvementPlaceholder')
          "
        />
      </label>

      <div
        v-if="type === 'bug'"
        class="rounded-md border border-(--ui-border) bg-(--ui-surface-muted)/40 p-3"
      >
        <p class="text-sm font-medium text-stone-800 dark:text-stone-200">
          {{ $t('feedback.contextTitle') }}
        </p>
        <ul class="mt-2 list-none space-y-1 text-sm text-stone-600 dark:text-stone-400">
          <li v-for="(line, index) in contextLines" :key="index">{{ line }}</li>
        </ul>
        <p class="ui-caption mt-2">{{ $t('feedback.contextAuto') }}</p>
      </div>

      <label v-if="type === 'bug'" class="ui-field">
        {{ $t('feedback.consoleLabel') }}
        <textarea
          v-model="consoleText"
          class="ui-textarea font-mono text-xs"
          rows="4"
          maxlength="8000"
          :placeholder="$t('feedback.consolePlaceholder')"
        />
      </label>

      <label v-if="type === 'bug'" class="ui-field">
        {{ $t('feedback.screenshotLabel') }}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          class="ui-input"
          @change="onScreenshotChange"
        />
      </label>
      <img
        v-if="type === 'bug' && screenshotPreview"
        :src="screenshotPreview"
        alt=""
        class="max-h-48 rounded-md border border-(--ui-border) object-contain"
      />

      <p class="ui-caption">
        {{ $t('feedback.identityHint', { name: auth.displayName, email: auth.user?.email }) }}
      </p>

      <p v-if="sendError" class="ui-alert-error text-sm" role="alert">{{ sendError }}</p>

      <button
        type="submit"
        class="ui-btn-primary ui-btn-md"
        :disabled="isSending || message.trim().length < 3"
      >
        {{ isSending ? $t('common.saving') : $t('feedback.submit') }}
      </button>
    </form>
  </section>
</template>
