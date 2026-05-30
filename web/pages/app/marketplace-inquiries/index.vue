<script setup lang="ts">
import { ApiError } from '~/lib/auth-api'
import { fetchMarketplaceInquiries } from '~/lib/marketplace-inquiries-api'
import { useAuthStore } from '~/stores/auth'
import type { MarketplaceInquirySummary } from '~/types/marketplace-inquiry'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
  ssr: false,
})

type InboxFilter = 'all' | 'customer' | 'seller'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()

const filter = ref<InboxFilter>('all')
const inquiries = ref<MarketplaceInquirySummary[]>([])
const isLoading = ref(true)
const loadError = ref('')

function otherParty(item: MarketplaceInquirySummary) {
  return item.role === 'seller' ? item.customer : item.seller
}

function roleBadgeKey(item: MarketplaceInquirySummary): 'roleBuying' | 'roleSelling' {
  return item.role === 'customer' ? 'roleBuying' : 'roleSelling'
}

function lastMessagePreview(item: MarketplaceInquirySummary): string {
  if (!item.lastMessage) {
    return ''
  }
  const prefix =
    item.lastMessage.senderUserId === auth.user?.id
      ? t('marketplace.inquiry.lastMessageYou')
      : otherParty(item).displayName
  return `${prefix}: ${item.lastMessage.body}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

async function loadInquiries() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const { inquiries: list } = await fetchMarketplaceInquiries(token, filter.value, {
      limit: 50,
    })
    inquiries.value = list
  } catch (err) {
    loadError.value =
      err instanceof ApiError ? err.message : t('marketplace.inquiry.loadError')
  } finally {
    isLoading.value = false
  }
}

watch(filter, () => {
  void loadInquiries()
})

onMounted(() => {
  void loadInquiries()
})
</script>

<template>
  <section class="ui-page-container">
    <NuxtLink :to="localePath('/app/profile')" class="ui-link-back mb-0! inline-flex">
      {{ $t('marketplace.backToProfile') }}
    </NuxtLink>

    <h1 class="ui-page-title mt-4">{{ $t('marketplace.inquiry.inboxTitle') }}</h1>
    <p class="ui-page-subtitle mt-2">{{ $t('marketplace.inquiry.inboxSubtitle') }}</p>

    <p class="ui-card mt-3 p-3 text-sm text-stone-700 dark:text-stone-300">
      {{ $t('marketplace.inquiry.inboxExplain') }}
    </p>

    <div class="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        class="ui-btn-sm"
        :class="filter === 'all' ? 'ui-btn-primary' : 'ui-btn-secondary'"
        @click="filter = 'all'"
      >
        {{ $t('marketplace.inquiry.filterAll') }}
      </button>
      <button
        type="button"
        class="ui-btn-sm"
        :class="filter === 'customer' ? 'ui-btn-primary' : 'ui-btn-secondary'"
        @click="filter = 'customer'"
      >
        {{ $t('marketplace.inquiry.filterBuying') }}
      </button>
      <button
        type="button"
        class="ui-btn-sm"
        :class="filter === 'seller' ? 'ui-btn-primary' : 'ui-btn-secondary'"
        @click="filter = 'seller'"
      >
        {{ $t('marketplace.inquiry.filterSelling') }}
      </button>
    </div>

    <p v-if="isLoading" class="ui-loading mt-6">{{ $t('common.loading') }}</p>
    <p v-else-if="loadError" class="ui-alert-error mt-6" role="alert">{{ loadError }}</p>
    <p v-else-if="inquiries.length === 0" class="ui-empty mt-8">
      {{ $t('marketplace.inquiry.emptyAll') }}
    </p>

    <ul v-else class="mt-6 flex list-none flex-col gap-3">
      <li v-for="item in inquiries" :key="item.id">
        <article class="ui-card overflow-hidden">
          <NuxtLink
            :to="localePath(`/app/marketplace-inquiries/${item.id}`)"
            class="block p-4 transition hover:bg-(--ui-surface-muted)/30"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <span
                  class="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="
                    item.role === 'customer'
                      ? 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100'
                      : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
                  "
                >
                  {{ $t(`marketplace.inquiry.${roleBadgeKey(item)}`) }}
                </span>
                <h2 class="mt-2 text-base font-semibold text-stone-900 line-clamp-2 dark:text-stone-100">
                  {{ item.listingTitle }}
                </h2>
                <p class="ui-caption mt-0.5">
                  {{ $t('marketplace.inquiry.listingId', { id: item.listingId }) }}
                </p>
                <p class="mt-2 text-sm text-stone-700 dark:text-stone-300">
                  {{ $t('marketplace.inquiry.withPerson', { name: otherParty(item).displayName }) }}
                </p>
                <p
                  v-if="item.lastMessage"
                  class="mt-2 line-clamp-2 text-sm text-stone-600 dark:text-stone-400"
                >
                  {{ lastMessagePreview(item) }}
                </p>
              </div>
              <div class="shrink-0 text-right">
                <span
                  v-if="item.unreadCount > 0"
                  class="inline-flex min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 py-0.5 text-xs font-semibold text-white"
                >
                  {{ item.unreadCount }}
                </span>
                <p v-if="item.lastMessage" class="ui-caption mt-1">
                  {{ formatTime(item.lastMessage.createdAt) }}
                </p>
              </div>
            </div>
          </NuxtLink>
          <div class="border-t border-(--ui-border) px-4 py-2">
            <NuxtLink
              :to="localePath(`/marketplace/${item.listingId}`)"
              class="ui-link text-sm"
            >
              {{ $t('marketplace.inquiry.viewListing') }}
            </NuxtLink>
          </div>
        </article>
      </li>
    </ul>
  </section>
</template>
