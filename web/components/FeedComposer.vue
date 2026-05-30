<script setup lang="ts">
import UserAvatar from '~/components/UserAvatar.vue'
import { ApiError } from '~/lib/auth-api'
import { createFeedPost } from '~/lib/feed-api'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { useAuthStore } from '~/stores/auth'

const emit = defineEmits<{
  published: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()
const authUiReady = useAuthUiReady()

const body = ref('')
const files = ref<File[]>([])
const previewUrls = ref<string[]>([])
const isPublishing = ref(false)
const formError = ref('')

const fileInput = ref<HTMLInputElement | null>(null)

const canPublish = computed(
  () => !isPublishing.value && (body.value.trim().length > 0 || files.value.length > 0),
)

function revokePreviews() {
  for (const url of previewUrls.value) {
    URL.revokeObjectURL(url)
  }
  previewUrls.value = []
}

function onPickFiles() {
  fileInput.value?.click()
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const picked = input.files ? [...input.files] : []
  input.value = ''
  if (picked.length === 0) {
    return
  }
  files.value = [...files.value, ...picked]
  for (const file of picked) {
    previewUrls.value.push(URL.createObjectURL(file))
  }
}

function removeFile(index: number) {
  URL.revokeObjectURL(previewUrls.value[index] ?? '')
  files.value = files.value.filter((_, i) => i !== index)
  previewUrls.value = previewUrls.value.filter((_, i) => i !== index)
}

async function publish() {
  const token = auth.accessToken
  if (!token) {
    return
  }
  if (!canPublish.value) {
    formError.value = t('feed.mediaRequired')
    return
  }

  isPublishing.value = true
  formError.value = ''
  try {
    await createFeedPost(token, { body: body.value, files: files.value })
    body.value = ''
    files.value = []
    revokePreviews()
    emit('published')
  } catch (err) {
    formError.value =
      err instanceof ApiError ? err.message : t('feed.publishError')
  } finally {
    isPublishing.value = false
  }
}

onBeforeUnmount(() => {
  revokePreviews()
})
</script>

<template>
  <div>
    <div
      v-if="!authUiReady"
      class="ui-feed-composer min-h-[7.5rem] animate-pulse bg-[var(--ui-surface-muted)]/40"
      aria-hidden="true"
    />

    <div v-else-if="auth.isAuthenticated" class="ui-feed-composer">
    <div class="ui-feed-composer-row">
      <UserAvatar
        :avatar-url="auth.user?.avatarUrl ?? null"
        :label="auth.avatarLabel"
        size="md"
      />
      <textarea
        v-model="body"
        class="ui-feed-composer-input"
        rows="3"
        :placeholder="$t('feed.composerPlaceholder')"
      />
    </div>

    <ul v-if="previewUrls.length > 0" class="ui-feed-preview-grid list-none">
      <li v-for="(url, index) in previewUrls" :key="url" class="ui-feed-preview-tile">
        <img
          v-if="files[index]?.type.startsWith('image/')"
          :src="url"
          alt=""
          class="h-full w-full object-cover"
        />
        <video
          v-else
          :src="url"
          class="h-full w-full object-cover"
          muted
          playsinline
        />
        <button
          type="button"
          class="ui-pet-photo-delete"
          :aria-label="$t('common.remove')"
          @click="removeFile(index)"
        >
          <Icon :icon="UI_ACTION_ICONS.remove" class="ui-icon-sm" aria-hidden="true" />
        </button>
      </li>
    </ul>

    <p v-if="formError" class="ui-alert-error mt-3" role="alert">
      {{ formError }}
    </p>

    <div class="ui-feed-composer-actions">
      <button type="button" class="ui-btn-secondary ui-btn-sm" @click="onPickFiles">
        <Icon :icon="UI_ACTION_ICONS.image" class="ui-icon-sm" aria-hidden="true" />
        {{ $t('feed.addMedia') }}
      </button>
      <input
        ref="fileInput"
        type="file"
        class="sr-only"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        multiple
        @change="onFilesSelected"
      />
      <button
        type="button"
        class="ui-btn-primary ui-btn-sm"
        :disabled="!canPublish"
        @click="publish"
      >
        {{ isPublishing ? $t('feed.publishing') : $t('feed.publish') }}
      </button>
    </div>
    </div>

    <p v-else class="ui-card p-4 text-sm text-[var(--ui-text-muted)]">
      {{ $t('feed.loginToPost') }}
      <NuxtLink :to="localePath('/login')" class="ui-link ml-1">
        {{ $t('auth.loginTitle') }}
      </NuxtLink>
    </p>
  </div>
</template>
