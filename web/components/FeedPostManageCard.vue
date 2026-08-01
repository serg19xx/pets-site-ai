<script setup lang="ts">
import { ApiError } from '~/lib/auth-api'
import {
  deleteFeedPost,
  deletePostComment,
  fetchPostComments,
  updateFeedPost,
} from '~/lib/feed-api'
import { mediaUrl } from '~/lib/media'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { useAuthStore } from '~/stores/auth'
import type { FeedComment, FeedPost } from '~/types/feed'

const props = defineProps<{
  post: FeedPost
}>()

const emit = defineEmits<{
  deleted: []
  updated: [post: FeedPost]
}>()

const { t } = useI18n()
const auth = useAuthStore()
const { formatIso } = useDateTime()

const postState = ref<FeedPost>({ ...props.post })
const isEditing = ref(false)
const editBody = ref('')
const isSaving = ref(false)
const isDeleting = ref(false)
const formError = ref('')

const commentsOpen = ref(false)
const comments = ref<FeedComment[]>([])
const commentsLoaded = ref(false)
const isLoadingComments = ref(false)

const timeLabel = computed(() => formatIso(postState.value.createdAt))

const previewMedia = computed(() => postState.value.media[0] ?? null)

watch(
  () => props.post,
  (value) => {
    postState.value = { ...value }
    editBody.value = value.body ?? ''
  },
  { immediate: true },
)

function mediaSrc(url: string): string {
  return mediaUrl(url) ?? url
}

function startEdit() {
  editBody.value = postState.value.body ?? ''
  formError.value = ''
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  editBody.value = postState.value.body ?? ''
}

async function saveEdit() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  isSaving.value = true
  formError.value = ''
  try {
    const { post } = await updateFeedPost(postState.value.id, token, editBody.value)
    postState.value = post
    isEditing.value = false
    emit('updated', post)
  } catch (err) {
    formError.value =
      err instanceof ApiError ? err.message : t('cabinetPosts.updateError')
  } finally {
    isSaving.value = false
  }
}

async function confirmDelete() {
  if (!window.confirm(t('cabinetPosts.deleteConfirm'))) {
    return
  }
  const token = auth.accessToken
  if (!token) {
    return
  }
  isDeleting.value = true
  formError.value = ''
  try {
    await deleteFeedPost(postState.value.id, token)
    emit('deleted')
  } catch (err) {
    formError.value =
      err instanceof ApiError ? err.message : t('cabinetPosts.deleteError')
  } finally {
    isDeleting.value = false
  }
}

async function toggleComments() {
  commentsOpen.value = !commentsOpen.value
  if (!commentsOpen.value || commentsLoaded.value) {
    return
  }
  isLoadingComments.value = true
  formError.value = ''
  try {
    const { comments: loaded } = await fetchPostComments(postState.value.id)
    comments.value = loaded
    commentsLoaded.value = true
  } catch (err) {
    formError.value =
      err instanceof ApiError ? err.message : t('cabinetPosts.commentsLoadError')
  } finally {
    isLoadingComments.value = false
  }
}

async function removeComment(commentId: number) {
  if (!window.confirm(t('cabinetPosts.deleteCommentConfirm'))) {
    return
  }
  const token = auth.accessToken
  if (!token) {
    return
  }
  try {
    await deletePostComment(postState.value.id, commentId, token)
    comments.value = comments.value.filter((c) => c.id !== commentId)
    const nextCount = Math.max(0, postState.value.commentCount - 1)
    postState.value = { ...postState.value, commentCount: nextCount }
    emit('updated', postState.value)
  } catch (err) {
    formError.value =
      err instanceof ApiError ? err.message : t('cabinetPosts.deleteCommentError')
  }
}
</script>

<template>
  <article class="ui-card overflow-hidden p-4">
    <div class="flex gap-3">
      <div
        v-if="previewMedia"
        class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800"
      >
        <img
          v-if="previewMedia.kind === 'image'"
          :src="mediaSrc(previewMedia.url)"
          alt=""
          class="h-full w-full object-cover"
        />
        <video
          v-else
          :src="mediaSrc(previewMedia.url)"
          class="h-full w-full object-cover"
          muted
          playsinline
        />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-xs text-[var(--ui-text-muted)]">{{ timeLabel }}</p>
        <p v-if="!isEditing && postState.body" class="mt-1 line-clamp-3 text-sm whitespace-pre-wrap">
          {{ postState.body }}
        </p>
        <p v-else-if="!isEditing && !postState.body" class="mt-1 text-sm text-[var(--ui-text-muted)]">
          {{ $t('cabinetPosts.mediaOnly') }}
        </p>
        <textarea
          v-else
          v-model="editBody"
          class="ui-textarea mt-2 w-full"
          rows="3"
          maxlength="5000"
        />
        <p class="ui-caption mt-2">
          {{ $t('cabinetPosts.stats', { likes: postState.likeCount, comments: postState.commentCount }) }}
        </p>
      </div>
    </div>

    <p v-if="formError" class="ui-alert-error mt-3 text-sm" role="alert">
      {{ formError }}
    </p>

    <div class="mt-3 flex flex-wrap gap-2 border-t border-[var(--ui-border)] pt-3">
      <template v-if="isEditing">
        <button type="button" class="ui-btn-ghost ui-btn-sm" @click="cancelEdit">
          {{ $t('common.cancel') }}
        </button>
        <button
          type="button"
          class="ui-btn-primary ui-btn-sm"
          :disabled="isSaving || (!editBody.trim() && postState.media.length === 0)"
          @click="saveEdit"
        >
          {{ isSaving ? $t('common.saving') : $t('common.save') }}
        </button>
      </template>
      <template v-else>
        <button type="button" class="ui-btn-secondary ui-btn-sm" @click="startEdit">
          <Icon :icon="UI_ACTION_ICONS.edit" class="ui-icon-sm" aria-hidden="true" />
          {{ $t('common.edit') }}
        </button>
        <button type="button" class="ui-btn-secondary ui-btn-sm" @click="toggleComments">
          <Icon :icon="UI_ACTION_ICONS.message" class="ui-icon-sm" aria-hidden="true" />
          {{ $t('cabinetPosts.moderateComments') }}
        </button>
        <button
          type="button"
          class="ui-btn-ghost ui-btn-sm text-red-600 dark:text-red-400"
          :disabled="isDeleting"
          @click="confirmDelete"
        >
          <Icon :icon="UI_ACTION_ICONS.remove" class="ui-icon-sm" aria-hidden="true" />
          {{ $t('common.remove') }}
        </button>
      </template>
    </div>

    <div v-if="commentsOpen" class="mt-3 border-t border-[var(--ui-border)] pt-3">
      <p v-if="isLoadingComments" class="text-sm text-[var(--ui-text-muted)]">
        {{ $t('common.loading') }}
      </p>
      <p v-else-if="comments.length === 0" class="text-sm text-[var(--ui-text-muted)]">
        {{ $t('feed.noComments') }}
      </p>
      <ul v-else class="list-none space-y-2">
        <li
          v-for="comment in comments"
          :key="comment.id"
          class="flex items-start justify-between gap-2 rounded-lg bg-[var(--ui-surface-inset)] p-2 text-sm"
        >
          <div class="min-w-0">
            <p class="font-medium">{{ comment.author.displayName }}</p>
            <p class="text-stone-700 dark:text-stone-300">{{ comment.body }}</p>
          </div>
          <button
            type="button"
            class="ui-btn-ghost ui-btn-sm shrink-0 text-red-600 dark:text-red-400"
            @click="removeComment(comment.id)"
          >
            <Icon :icon="UI_ACTION_ICONS.remove" class="ui-icon-sm" aria-hidden="true" />
            <span class="sr-only">{{ $t('cabinetPosts.deleteComment') }}</span>
          </button>
        </li>
      </ul>
    </div>
  </article>
</template>
