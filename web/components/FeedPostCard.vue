<script setup lang="ts">
import UserAvatar from '~/components/UserAvatar.vue'
import { ApiError } from '~/lib/auth-api'
import { mediaUrl } from '~/lib/media'
import {
  createPostComment,
  fetchPostComments,
  toggleFeedPostLike,
  toggleFeedPostSave,
} from '~/lib/feed-api'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { useAuthStore } from '~/stores/auth'
import type { FeedComment, FeedPost } from '~/types/feed'

const props = defineProps<{
  post: FeedPost
}>()

const emit = defineEmits<{
  update: [post: FeedPost]
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()
const { formatIso } = useDateTime()

const postState = ref<FeedPost>({ ...props.post })
const comments = ref<FeedComment[]>([])
const commentsOpen = ref(false)
const commentsLoaded = ref(false)
const commentBody = ref('')
const isSubmittingComment = ref(false)
const isTogglingLike = ref(false)
const isTogglingSave = ref(false)
const interactionError = ref('')
const commentError = ref('')

watch(
  () => props.post,
  (value) => {
    postState.value = { ...value }
  },
)

const authorInitial = computed(() => {
  const name = postState.value.author.displayName.trim()
  return name ? name.charAt(0).toUpperCase() : '?'
})

const timeLabel = computed(() => formatIso(postState.value.createdAt))

const mediaGridClass = computed(() =>
  postState.value.media.length > 1 ? 'ui-feed-post-media-grid--multi' : '',
)

function mediaSrc(url: string): string {
  return mediaUrl(url) ?? url
}

function patchPost(patch: Partial<FeedPost>) {
  postState.value = { ...postState.value, ...patch }
  emit('update', postState.value)
}

function requireAuth(): boolean {
  if (!auth.isAuthenticated) {
    interactionError.value = t('feed.loginToInteract')
    return false
  }
  interactionError.value = ''
  return true
}

async function onToggleLike() {
  const token = auth.accessToken
  if (!requireAuth() || !token || isTogglingLike.value) {
    return
  }
  isTogglingLike.value = true
  try {
    const status = await toggleFeedPostLike(postState.value.id, token)
    patchPost({
      liked: status.liked,
      likeCount: status.likeCount,
      saved: status.saved,
    })
  } catch (err) {
    interactionError.value =
      err instanceof ApiError ? err.message : t('pet.likeToggleError')
  } finally {
    isTogglingLike.value = false
  }
}

async function onToggleSave() {
  const token = auth.accessToken
  if (!requireAuth() || !token || isTogglingSave.value) {
    return
  }
  isTogglingSave.value = true
  try {
    const { saved } = await toggleFeedPostSave(postState.value.id, token)
    patchPost({ saved })
  } catch (err) {
    interactionError.value =
      err instanceof ApiError ? err.message : t('feed.publishError')
  } finally {
    isTogglingSave.value = false
  }
}

async function toggleComments() {
  commentsOpen.value = !commentsOpen.value
  if (commentsOpen.value && !commentsLoaded.value) {
    try {
      const { comments: loaded } = await fetchPostComments(postState.value.id)
      comments.value = loaded
      commentsLoaded.value = true
    } catch {
      commentError.value = t('feed.commentError')
    }
  }
}

async function submitComment() {
  const token = auth.accessToken
  if (!requireAuth() || !token || isSubmittingComment.value) {
    return
  }
  const trimmed = commentBody.value.trim()
  if (!trimmed) {
    return
  }
  isSubmittingComment.value = true
  commentError.value = ''
  try {
    const { comment } = await createPostComment(postState.value.id, token, trimmed)
    comments.value = [...comments.value, comment]
    commentBody.value = ''
    patchPost({ commentCount: postState.value.commentCount + 1 })
    commentsLoaded.value = true
    commentsOpen.value = true
  } catch (err) {
    commentError.value =
      err instanceof ApiError ? err.message : t('feed.commentError')
  } finally {
    isSubmittingComment.value = false
  }
}
</script>

<template>
  <article class="ui-feed-post">
    <header class="ui-feed-post-header">
      <NuxtLink
        :to="localePath(`/members/${postState.author.id}`)"
        class="shrink-0"
      >
        <UserAvatar
          :avatar-url="postState.author.avatarUrl"
          :label="authorInitial"
          size="md"
        />
      </NuxtLink>
      <div class="min-w-0">
        <NuxtLink
          :to="localePath(`/members/${postState.author.id}`)"
          class="font-semibold text-stone-900 hover:underline dark:text-stone-100"
        >
          {{ postState.author.displayName }}
        </NuxtLink>
        <p class="text-xs text-(--ui-text-muted)">{{ timeLabel }}</p>
      </div>
    </header>

    <p v-if="postState.body" class="ui-feed-post-body">
      {{ postState.body }}
    </p>

    <div v-if="postState.media.length > 0" class="ui-feed-post-media">
      <div
        class="ui-feed-post-media-grid"
        :class="mediaGridClass"
      >
        <div
          v-for="item in postState.media"
          :key="item.id"
          class="ui-feed-post-media-item"
        >
          <img
            v-if="item.kind === 'image'"
            :src="mediaSrc(item.url)"
            alt=""
            loading="lazy"
            decoding="async"
          />
          <video
            v-else
            :src="mediaSrc(item.url)"
            controls
            playsinline
            preload="metadata"
          />
        </div>
      </div>
    </div>

    <footer class="ui-feed-post-footer">
      <button
        type="button"
        class="ui-feed-action-btn ui-feed-action-btn--like"
        :class="{ 'ui-feed-action-btn--liked': postState.liked }"
        :disabled="isTogglingLike"
        @click="onToggleLike"
      >
        <svg
          viewBox="0 0 24 24"
          class="ui-feed-like-icon"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M19.5 12.5721L12 20L4.5 12.5721C3.0052 11.0921 2.75 8.79606 3.87868 7.01777C5.34777 4.70223 8.53553 4.19491 10.6716 5.96447L12 7.06531L13.3284 5.96447C15.4645 4.19491 18.6522 4.70223 20.1213 7.01777C21.25 8.79606 20.9948 11.0921 19.5 12.5721Z"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>{{ postState.likeCount }}</span>
        <span class="sr-only">
          {{ postState.liked ? $t('feed.unlike') : $t('feed.like') }}
        </span>
      </button>

      <button
        type="button"
        class="ui-feed-action-btn"
        @click="toggleComments"
      >
        <Icon :icon="UI_ACTION_ICONS.message" class="ui-icon-sm" aria-hidden="true" />
        <span>{{ postState.commentCount }}</span>
        <span class="sr-only">{{ $t('feed.comment') }}</span>
      </button>

      <button
        type="button"
        class="ui-feed-action-btn"
        :class="{ 'ui-feed-action-btn--active': postState.saved }"
        :disabled="isTogglingSave"
        @click="onToggleSave"
      >
        <Icon :icon="UI_ACTION_ICONS.bookmark" class="ui-icon-sm" aria-hidden="true" />
        <span class="sr-only">
          {{ postState.saved ? $t('feed.unsave') : $t('feed.save') }}
        </span>
      </button>
    </footer>

    <p v-if="interactionError" class="ui-alert-error mx-4 mb-2 text-xs" role="alert">
      {{ interactionError }}
    </p>

    <section v-if="commentsOpen" class="ui-feed-comments">
      <p v-if="comments.length === 0 && commentsLoaded" class="text-sm text-(--ui-text-muted)">
        {{ $t('feed.noComments') }}
      </p>
      <ul v-else class="list-none">
        <li
          v-for="comment in comments"
          :key="comment.id"
          class="ui-feed-comment"
        >
          <UserAvatar
            :avatar-url="comment.author.avatarUrl"
            :label="comment.author.displayName.charAt(0).toUpperCase()"
            size="xs"
          />
          <div>
            <p class="font-medium text-stone-900 dark:text-stone-100">
              {{ comment.author.displayName }}
            </p>
            <p class="text-stone-700 dark:text-stone-300">{{ comment.body }}</p>
          </div>
        </li>
      </ul>

      <form
        v-if="auth.isAuthenticated"
        class="ui-feed-comment-form"
        @submit.prevent="submitComment"
      >
        <input
          v-model="commentBody"
          type="text"
          class="ui-input flex-1"
          :placeholder="$t('feed.commentPlaceholder')"
          maxlength="2000"
        />
        <button
          type="submit"
          class="ui-btn-primary ui-btn-sm"
          :disabled="isSubmittingComment || !commentBody.trim()"
        >
          <Icon :icon="UI_ACTION_ICONS.send" class="ui-icon-sm" aria-hidden="true" />
          <span class="sr-only">{{ $t('feed.submitComment') }}</span>
        </button>
      </form>

      <p v-if="commentError" class="ui-alert-error mt-2 text-xs" role="alert">
        {{ commentError }}
      </p>
    </section>
  </article>
</template>
