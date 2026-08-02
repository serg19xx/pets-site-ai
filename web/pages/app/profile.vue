<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

import ImageCropModal from '~/components/ImageCropModal.vue'
import UserAvatar from '~/components/UserAvatar.vue'
import {
  ApiError,
  fetchMe,
  removeAvatar,
  updateProfile,
  uploadAvatar,
  type UpdateProfilePayload,
} from '~/lib/auth-api'
import { validateImageFile } from '~/lib/image-export'
import { useAuthStore } from '~/stores/auth'
import { USER_GENDERS, type UserGender, type UserProfile } from '~/types/user'
import { useEnumLabels } from '~/composables/useEnumLabels'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()
const { genderLabel } = useEnumLabels()

const isEditing = ref(false)
const isLoading = ref(false)
const isSaving = ref(false)
const isUploadingAvatar = ref(false)
const isAvatarCropOpen = ref(false)
const pendingAvatarFile = ref<File | null>(null)
const avatarInputRef = ref<HTMLInputElement | null>(null)
const formError = ref('')
const successMessage = ref('')

const fullName = ref('')
const nickname = ref('')
const phone = ref('')
const gender = ref<UserGender>('prefer_not_to_say')
const dateOfBirth = ref('')
const showFullName = ref(true)
const showNickname = ref(true)
const showEmail = ref(false)
const showPhone = ref(false)
const showGender = ref(false)
const showDateOfBirth = ref(false)

const phoneDisplay = computed(() => {
  const value = auth.user?.phone?.trim()
  return value || t('common.notProvided')
})

const hasPhone = computed(() => Boolean(auth.user?.phone?.trim()))

function loadFormFromUser(user: UserProfile) {
  fullName.value = user.fullName
  nickname.value = user.nickname
  phone.value = user.phone ?? ''
  gender.value = user.gender
  dateOfBirth.value = user.dateOfBirth
  showFullName.value = user.showFullName ?? true
  showNickname.value = user.showNickname ?? true
  showEmail.value = user.showEmail ?? false
  showPhone.value = user.showPhone ?? false
  showGender.value = user.showGender ?? false
  showDateOfBirth.value = user.showDateOfBirth ?? false
}

function startEditing() {
  if (!auth.user) {
    return
  }
  loadFormFromUser(auth.user)
  formError.value = ''
  successMessage.value = ''
  isEditing.value = true
}

function cancelEditing() {
  isEditing.value = false
  formError.value = ''
}

async function refreshProfile() {
  if (!auth.accessToken) {
    return
  }
  isLoading.value = true
  try {
    const session = await fetchMe(auth.accessToken)
    auth.setSession({
      accessToken: auth.accessToken,
      user: session.user,
      mustChangePassword: session.mustChangePassword,
    })
  } catch {
    /* keep cached user if refresh fails */
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void refreshProfile()
})

watch(
  () => auth.user,
  (user) => {
    if (user && !isEditing.value) {
      loadFormFromUser(user)
    }
  },
  { immediate: true },
)

async function saveProfile() {
  formError.value = ''
  successMessage.value = ''

  if (!showFullName.value && !showNickname.value) {
    formError.value = t('profile.visibilityError')
    return
  }

  if (!auth.accessToken) {
    formError.value = t('auth.notSignedIn')
    return
  }

  const payload: UpdateProfilePayload = {
    fullName: fullName.value.trim(),
    nickname: nickname.value.trim() || undefined,
    phone: phone.value.trim() || undefined,
    gender: gender.value,
    dateOfBirth: dateOfBirth.value,
    showFullName: showFullName.value,
    showNickname: showNickname.value,
    showEmail: showEmail.value,
    showPhone: showPhone.value,
    showGender: showGender.value,
    showDateOfBirth: showDateOfBirth.value,
  }

  isSaving.value = true
  try {
    const result = await updateProfile(auth.accessToken, payload)
    auth.updateUser(result.user)
    successMessage.value = t('profile.saved')
    isEditing.value = false
  } catch (error) {
    if (error instanceof ApiError) {
      formError.value = error.message
    } else {
      formError.value = t('common.saveError')
    }
  } finally {
    isSaving.value = false
  }
}

function hiddenLabel(visible: boolean | undefined) {
  return visible ? '' : t('common.hiddenFromOthers')
}

function pickAvatar() {
  avatarInputRef.value?.click()
}

function onAvatarSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }

  const validationError = validateImageFile(file)
  if (validationError) {
    formError.value = validationError
    return
  }

  formError.value = ''
  pendingAvatarFile.value = file
  isAvatarCropOpen.value = true
}

async function onAvatarCropConfirm(file: File) {
  if (!auth.accessToken) {
    return
  }

  isUploadingAvatar.value = true
  formError.value = ''
  try {
    const result = await uploadAvatar(auth.accessToken, file)
    auth.updateUser(result.user)
    successMessage.value = t('profile.avatarUpdated')
  } catch (error) {
    if (error instanceof ApiError) {
      formError.value = error.message
    } else {
      formError.value = t('profile.uploadError')
    }
  } finally {
    isUploadingAvatar.value = false
    pendingAvatarFile.value = null
  }
}

async function onRemoveAvatar() {
  if (!auth.accessToken || !auth.user?.avatarUrl) {
    return
  }
  isUploadingAvatar.value = true
  formError.value = ''
  try {
    const result = await removeAvatar(auth.accessToken)
    auth.updateUser(result.user)
    successMessage.value = t('profile.avatarRemoved')
  } catch (error) {
    if (error instanceof ApiError) {
      formError.value = error.message
    } else {
      formError.value = t('profile.removeAvatarError')
    }
  } finally {
    isUploadingAvatar.value = false
  }
}
</script>

<template>
  <section class="ui-page-container">
    <div class="flex items-center justify-between gap-3">
      <h1 class="ui-page-title">{{ $t('profile.title') }}</h1>
      <div v-if="auth.user && !isEditing">
        <button
          type="button"
          class="ui-btn-ghost ui-btn-sm"
          @click="startEditing"
        >
          <Icon :icon="UI_ACTION_ICONS.edit" class="ui-icon-sm" aria-hidden="true" />
          {{ $t('common.edit') }}
        </button>
      </div>
      <div v-else-if="isEditing" class="flex gap-2">
        <button
          type="button"
          class="ui-btn-ghost ui-btn-sm"
          :disabled="isSaving"
          @click="cancelEditing"
        >
          {{ $t('common.cancel') }}
        </button>
        <button
          type="button"
          class="ui-btn-primary ui-btn-sm disabled:opacity-60"
          :disabled="isSaving"
          @click="saveProfile"
        >
          {{ isSaving ? $t('common.saving') : $t('common.save') }}
        </button>
      </div>
    </div>

    <p v-if="isLoading" class="ui-page-subtitle mt-2">{{ $t('profile.loading') }}</p>

    <p
      v-if="formError"
      class="ui-alert-error mt-4"
      role="alert"
    >
      {{ formError }}
    </p>
    <p
      v-if="successMessage"
      class="ui-alert-success mt-4"
      role="status"
    >
      {{ successMessage }}
    </p>

    <form
      v-if="auth.user"
      class="ui-card ui-form-stack mt-6"
      @submit.prevent="saveProfile"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div class="flex flex-col items-center gap-2 sm:items-start">
          <UserAvatar
            :avatar-url="auth.user.avatarUrl"
            :label="auth.avatarLabel"
            size="lg"
          />
          <input
            ref="avatarInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="hidden"
            @change="onAvatarSelected"
          />
          <div v-if="isEditing" class="flex flex-wrap gap-2">
            <button
              type="button"
              class="ui-btn-ghost ui-btn-xs"
              :disabled="isUploadingAvatar"
              @click="pickAvatar"
            >
              {{ isUploadingAvatar ? $t('common.uploading') : $t('profile.changePhoto') }}
            </button>
            <button
              v-if="auth.user.avatarUrl"
              type="button"
              class="ui-btn-danger ui-btn-xs"
              :disabled="isUploadingAvatar"
              @click="onRemoveAvatar"
            >
              {{ $t('common.remove') }}
            </button>
          </div>
          <p v-else-if="auth.user.avatarUrl" class="ui-caption">{{ $t('profile.tapEditPhoto') }}</p>
        </div>
        <div class="min-w-0 flex-1 space-y-3">
          <template v-if="!isEditing">
            <div>
              <p class="ui-field-value">{{ auth.user.fullName }}</p>
              <p
                v-if="auth.user.nickname"
                class="ui-body mt-0.5"
              >
                {{ $t('profile.nicknameLabel') }} {{ auth.user.nickname }}
                <span class="ui-caption">{{ hiddenLabel(auth.user.showNickname) }}</span>
              </p>
              <p class="ui-caption mt-1">
                {{ $t('profile.shownToOthers', { name: auth.displayName }) }}
              </p>
            </div>
          </template>
          <template v-else>
            <label class="ui-field">
              {{ $t('profile.fullName') }}
              <input
                v-model="fullName"
                type="text"
                required
                class="ui-input"
              />
            </label>
            <label class="ui-field">
              {{ $t('profile.nickname') }}
              <input
                v-model="nickname"
                type="text"
                class="ui-input"
                :placeholder="$t('profile.nicknamePlaceholder')"
              />
            </label>
            <div class="space-y-2">
              <label class="ui-checkbox-label flex">
                <input v-model="showFullName" type="checkbox" class="ui-checkbox" />
                {{ $t('profile.showFullName') }}
              </label>
              <label class="ui-checkbox-label flex">
                <input v-model="showNickname" type="checkbox" class="ui-checkbox" />
                {{ $t('profile.showNickname') }}
              </label>
            </div>
          </template>
        </div>
      </div>

      <div class="ui-field-row">
        <h2 class="ui-section-title">
          {{ $t('profile.personal') }}
        </h2>

        <div>
          <p class="ui-field-label">
            {{ $t('profile.gender') }}
            <span v-if="!isEditing" class="font-normal">{{ hiddenLabel(auth.user.showGender) }}</span>
          </p>
          <p v-if="!isEditing" class="font-medium">{{ genderLabel(auth.user.gender) }}</p>
          <template v-else>
            <select
              v-model="gender"
              class="ui-select"
            >
              <option v-for="g in USER_GENDERS" :key="g" :value="g">
                {{ genderLabel(g) }}
              </option>
            </select>
            <label class="ui-checkbox-label">
              <input v-model="showGender" type="checkbox" class="ui-checkbox" />
              {{ $t('profile.showGender') }}
            </label>
          </template>
        </div>

        <div>
          <p class="ui-field-label">
            {{ $t('profile.dateOfBirth') }}
            <span v-if="!isEditing" class="font-normal">{{ hiddenLabel(auth.user.showDateOfBirth) }}</span>
          </p>
          <p v-if="!isEditing" class="font-medium">{{ auth.user.dateOfBirth }}</p>
          <template v-else>
            <DateOfBirthField
              id="profile-date-of-birth"
              v-model="dateOfBirth"
              required
            />
            <label class="ui-checkbox-label">
              <input v-model="showDateOfBirth" type="checkbox" class="ui-checkbox" />
              {{ $t('profile.showDob') }}
            </label>
          </template>
        </div>
      </div>
      <div class="ui-field-row">
        <h2 class="ui-section-title">
          {{ $t('profile.contact') }}
        </h2>

        <div class="text-sm">
          <p class="ui-field-label">{{ $t('auth.email') }}</p>
          <p class="mt-0.5 break-all font-medium">{{ auth.user.email }}</p>
          <p class="ui-caption mt-0.5">{{ $t('profile.emailReadonly') }}</p>
          <label
            v-if="isEditing"
            class="ui-checkbox-label"
          >
            <input v-model="showEmail" type="checkbox" class="ui-checkbox" />
            {{ $t('profile.showEmail') }}
          </label>
        </div>

        <div class="text-sm">
          <p class="ui-field-label">{{ $t('profile.timezone') }}</p>
          <p class="mt-0.5 font-medium">
            {{ auth.user.timezone || $t('profile.timezonePending') }}
          </p>
          <p class="ui-caption mt-0.5">{{ $t('profile.timezoneHint') }}</p>
        </div>

        <div class="text-sm">
          <p class="ui-field-label">
            {{ $t('profile.phone') }}
            <span v-if="!isEditing" class="font-normal">{{ hiddenLabel(auth.user.showPhone) }}</span>
          </p>
          <template v-if="!isEditing">
            <a
              v-if="hasPhone"
              :href="`tel:${auth.user.phone}`"
              class="ui-link mt-0.5 block font-medium"
            >
              {{ phoneDisplay }}
            </a>
            <p v-else class="ui-caption mt-0.5">{{ phoneDisplay }}</p>
          </template>
          <input
            v-else
            v-model="phone"
            type="tel"
            class="ui-input"
            :placeholder="$t('common.optional')"
          />
          <label
            v-if="isEditing"
            class="ui-checkbox-label"
          >
            <input v-model="showPhone" type="checkbox" class="ui-checkbox" />
            {{ $t('profile.showPhone') }}
          </label>
        </div>
      </div>

      <p
        v-if="isEditing"
        class="ui-form-footer-hint"
      >
        {{ $t('profile.privacyHint') }}
      </p>
    </form>

    <div v-if="auth.user" class="mt-8">
      <h2 class="ui-section-title">{{ $t('profile.feedSection') }}</h2>
      <ul class="mt-3 flex list-none flex-col gap-2">
        <li>
          <NuxtLink :to="localePath('/app/my-posts')" class="ui-list-link">
            <Icon :icon="UI_ACTION_ICONS.send" class="ui-icon-md shrink-0 text-primary-600" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <p class="ui-list-link-title">{{ $t('auth.myPosts') }}</p>
              <p class="ui-list-link-meta">{{ $t('profile.myPostsHint') }}</p>
            </div>
            <Icon :icon="UI_ACTION_ICONS.chevron" class="ui-icon-sm shrink-0 text-(--ui-text-muted)" aria-hidden="true" />
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="localePath('/app/saved')" class="ui-list-link">
            <Icon :icon="UI_ACTION_ICONS.bookmark" class="ui-icon-md shrink-0 text-primary-600" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <p class="ui-list-link-title">{{ $t('auth.saved') }}</p>
              <p class="ui-list-link-meta">{{ $t('profile.savedHint') }}</p>
            </div>
            <Icon :icon="UI_ACTION_ICONS.chevron" class="ui-icon-sm shrink-0 text-(--ui-text-muted)" aria-hidden="true" />
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="localePath('/app/my-listings')" class="ui-list-link">
            <Icon :icon="UI_ACTION_ICONS.star" class="ui-icon-md shrink-0 text-primary-600" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <p class="ui-list-link-title">{{ $t('auth.myListings') }}</p>
              <p class="ui-list-link-meta">{{ $t('profile.myListingsHint') }}</p>
            </div>
            <Icon :icon="UI_ACTION_ICONS.chevron" class="ui-icon-sm shrink-0 text-(--ui-text-muted)" aria-hidden="true" />
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="localePath('/app/liked-pets')" class="ui-list-link">
            <Icon :icon="UI_ACTION_ICONS.heart" class="ui-icon-md shrink-0 text-primary-600" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <p class="ui-list-link-title">{{ $t('auth.likedPets') }}</p>
              <p class="ui-list-link-meta">{{ $t('profile.likedPetsHint') }}</p>
            </div>
            <Icon :icon="UI_ACTION_ICONS.chevron" class="ui-icon-sm shrink-0 text-(--ui-text-muted)" aria-hidden="true" />
          </NuxtLink>
        </li>
      </ul>
    </div>

    <ImageCropModal
      v-model="isAvatarCropOpen"
      :file="pendingAvatarFile"
      :title="$t('profile.cropAvatar')"
      output-file-name="avatar.jpg"
      :max-output-size="512"
      circular-preview
      @confirm="onAvatarCropConfirm"
    />
  </section>
</template>
