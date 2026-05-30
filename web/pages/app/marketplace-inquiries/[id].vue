<script setup lang="ts">
import { ApiError } from '~/lib/auth-api'
import {
  fetchMarketplaceInquiryThread,
  replyMarketplaceInquiry,
} from '~/lib/marketplace-inquiries-api'
import { useAuthStore } from '~/stores/auth'
import type { MarketplaceInquiryThread } from '~/types/marketplace-inquiry'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
  ssr: false,
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()

const inquiryId = computed(() => Number(route.params.id))
const thread = ref<MarketplaceInquiryThread | null>(null)
const isLoading = ref(true)
const loadError = ref('')
const replyBody = ref('')
const isSending = ref(false)
const sendError = ref('')

const otherParty = computed(() => {
  if (!thread.value) {
    return null
  }
  return thread.value.inquiry.role === 'seller'
    ? thread.value.inquiry.customer
    : thread.value.inquiry.seller
})

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

async function loadThread() {
  const id = inquiryId.value
  const token = auth.accessToken
  if (!token || !Number.isInteger(id) || id < 1) {
    loadError.value = t('marketplace.inquiry.invalidId')
    isLoading.value = false
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    thread.value = await fetchMarketplaceInquiryThread(id, token)
  } catch (err) {
    loadError.value =
      err instanceof ApiError ? err.message : t('marketplace.inquiry.loadError')
  } finally {
    isLoading.value = false
  }
}

async function onReply() {
  const token = auth.accessToken
  const trimmed = replyBody.value.trim()
  if (!token || !trimmed || isSending.value) {
    return
  }
  isSending.value = true
  sendError.value = ''
  try {
    thread.value = await replyMarketplaceInquiry(inquiryId.value, token, trimmed)
    replyBody.value = ''
  } catch (err) {
    sendError.value =
      err instanceof ApiError ? err.message : t('marketplace.inquiry.sendError')
  } finally {
    isSending.value = false
  }
}

watch(inquiryId, () => {
  void loadThread()
}, { immediate: true })
</script>

<template>
  <section class="ui-page-container">
    <NuxtLink :to="localePath('/app/marketplace-inquiries')" class="ui-link-back mb-0! inline-flex">
      {{ $t('marketplace.inquiry.backToInbox') }}
    </NuxtLink>

    <p v-if="isLoading" class="ui-loading mt-6">{{ $t('common.loading') }}</p>
    <p v-else-if="loadError" class="ui-alert-error mt-6" role="alert">{{ loadError }}</p>

    <template v-else-if="thread">
      <header class="ui-card mt-4 p-4">
        <p
          class="rounded-md px-3 py-2 text-sm"
          :class="
            thread.inquiry.role === 'customer'
              ? 'bg-sky-50 text-sky-950 dark:bg-sky-950/50 dark:text-sky-100'
              : 'bg-amber-50 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100'
          "
        >
          {{
            thread.inquiry.role === 'customer'
              ? $t('marketplace.inquiry.threadAsBuyer')
              : $t('marketplace.inquiry.threadAsSeller')
          }}
        </p>
        <h1 class="ui-page-title mt-3">{{ thread.inquiry.listingTitle }}</h1>
        <p class="ui-caption mt-0.5">
          {{ $t('marketplace.inquiry.listingId', { id: thread.inquiry.listingId }) }}
        </p>
        <p class="mt-2 text-sm text-stone-700 dark:text-stone-300">
          {{ $t('marketplace.inquiry.withPerson', { name: otherParty?.displayName ?? '' }) }}
        </p>
        <p class="ui-caption mt-2">{{ $t('marketplace.inquiry.threadHint') }}</p>
        <NuxtLink
          :to="localePath(`/marketplace/${thread.inquiry.listingId}`)"
          class="ui-link mt-3 inline-block text-sm"
        >
          {{ $t('marketplace.inquiry.viewListing') }}
        </NuxtLink>
      </header>

      <ul class="mt-6 flex list-none flex-col gap-3">
        <li
          v-for="msg in thread.messages"
          :key="msg.id"
          class="flex"
          :class="msg.isMine ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[85%] rounded-lg px-3 py-2 text-sm"
            :class="
              msg.isMine
                ? 'bg-primary-600 text-white'
                : 'bg-(--ui-surface-muted) text-stone-800 dark:text-stone-200'
            "
          >
            <p class="whitespace-pre-wrap">{{ msg.body }}</p>
            <p
              class="mt-1 text-xs opacity-80"
              :class="msg.isMine ? 'text-primary-100' : 'text-(--ui-text-muted)'"
            >
              {{ formatTime(msg.createdAt) }}
            </p>
          </div>
        </li>
      </ul>

      <form class="ui-form-stack ui-card mt-6 p-4" @submit.prevent="onReply">
        <label class="ui-field">
          {{ $t('marketplace.inquiry.replyLabel') }}
          <textarea
            v-model="replyBody"
            class="ui-textarea"
            rows="3"
            required
            minlength="1"
            maxlength="2000"
            :placeholder="$t('marketplace.inquiry.messagePlaceholder')"
          />
        </label>
        <p v-if="sendError" class="ui-alert-error text-sm" role="alert">{{ sendError }}</p>
        <button
          type="submit"
          class="ui-btn-primary ui-btn-sm"
          :disabled="isSending || !replyBody.trim()"
        >
          {{ isSending ? $t('common.saving') : $t('marketplace.inquiry.reply') }}
        </button>
      </form>
    </template>
  </section>
</template>
