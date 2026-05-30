<script setup lang="ts">
import FeedPostManageCard from '~/components/FeedPostManageCard.vue'
import { ApiError } from '~/lib/auth-api'
import { fetchMyFeedPosts } from '~/lib/feed-api'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { useAuthStore } from '~/stores/auth'
import type { FeedPost } from '~/types/feed'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()

const posts = ref<FeedPost[]>([])
const isLoading = ref(true)
const loadError = ref('')

async function loadPosts() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const result = await fetchMyFeedPosts(token, { limit: 50 })
    posts.value = result.posts
  } catch (err) {
    loadError.value =
      err instanceof ApiError ? err.message : t('cabinetPosts.loadError')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadPosts()
})

function onDeleted(postId: number) {
  posts.value = posts.value.filter((p) => p.id !== postId)
}

function onUpdated(updated: FeedPost) {
  posts.value = posts.value.map((p) => (p.id === updated.id ? updated : p))
}
</script>

<template>
  <section class="ui-page-container">
    <NuxtLink
      :to="localePath('/app/profile')"
      class="ui-link-back mb-0! inline-flex"
    >
      <Icon :icon="UI_ACTION_ICONS.back" class="ui-icon-sm" aria-hidden="true" />
      {{ $t('cabinetPosts.backToProfile') }}
    </NuxtLink>

    <h1 class="ui-page-title mt-4">{{ $t('cabinetPosts.myPostsTitle') }}</h1>
    <p class="ui-page-subtitle mt-2">{{ $t('cabinetPosts.myPostsSubtitle') }}</p>

    <p v-if="isLoading" class="ui-loading mt-8">{{ $t('common.loading') }}</p>
    <p v-else-if="loadError" class="ui-alert-error mt-8" role="alert">
      {{ loadError }}
    </p>
    <p v-else-if="posts.length === 0" class="ui-empty mt-8">
      {{ $t('cabinetPosts.myPostsEmpty') }}
    </p>

    <ul v-else class="mt-6 flex list-none flex-col gap-4">
      <li v-for="post in posts" :key="post.id">
        <FeedPostManageCard
          :post="post"
          @deleted="onDeleted(post.id)"
          @updated="onUpdated"
        />
      </li>
    </ul>
  </section>
</template>
