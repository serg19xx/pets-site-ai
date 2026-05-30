<script setup lang="ts">
import FeedComposer from '~/components/FeedComposer.vue'
import FeedPostCard from '~/components/FeedPostCard.vue'
import { ApiError } from '~/lib/auth-api'
import { fetchFeedPosts } from '~/lib/feed-api'
import { useAuthStore } from '~/stores/auth'
import type { FeedPost } from '~/types/feed'

const { t, locale } = useI18n()
const auth = useAuthStore()
const authUiReady = useAuthUiReady()

usePageSeo({
  title: computed(() => t('meta.feed.title')),
  description: computed(() => t('meta.feed.description')),
})

const {
  data: feedData,
  error: feedError,
  pending: isLoading,
  refresh: refreshFeed,
} = await useAsyncData(
  () => `feed-posts-${locale.value}`,
  () =>
    fetchFeedPosts({
      limit: 30,
      accessToken: auth.accessToken ?? undefined,
    }),
  { server: false, watch: [locale] },
)

const posts = computed(() => feedData.value?.posts ?? [])
const loadError = computed(() => {
  if (!feedError.value) {
    return ''
  }
  const err = feedError.value
  if (err instanceof ApiError) {
    return err.message
  }
  return t('feed.loadError')
})

watch(authUiReady, (ready) => {
  if (ready) {
    void refreshFeed()
  }
})

function onPublished() {
  void refreshFeed()
}

function onPostUpdate(updated: FeedPost) {
  if (!feedData.value) {
    return
  }
  feedData.value = {
    ...feedData.value,
    posts: feedData.value.posts.map((p) => (p.id === updated.id ? updated : p)),
  }
}

</script>

<template>
  <section class="ui-page-container">
    <h1 class="ui-page-title">{{ $t('feed.title') }}</h1>
    <p class="ui-page-subtitle mt-2">{{ $t('feed.subtitle') }}</p>

    <FeedComposer class="mt-6" @published="onPublished" />

    <p v-if="isLoading" class="ui-loading mt-8">{{ $t('common.loading') }}</p>
    <p
      v-else-if="loadError"
      class="ui-alert-error mt-8"
      role="alert"
    >
      {{ loadError }}
    </p>
    <p v-else-if="posts.length === 0" class="ui-empty mt-8">
      {{ $t('feed.empty') }}
    </p>

    <ul v-else class="mt-6 flex list-none flex-col gap-4">
      <li v-for="post in posts" :key="post.id">
        <FeedPostCard :post="post" @update="onPostUpdate" />
      </li>
    </ul>
  </section>
</template>
