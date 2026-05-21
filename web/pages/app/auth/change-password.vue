<script setup lang="ts">
import { ref } from 'vue'

import { ApiError, changePassword } from '~/lib/auth-api'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const formError = ref('')
const successMessage = ref('')
const isSubmitting = ref(false)

async function handleSubmit() {
  formError.value = ''
  successMessage.value = ''

  const next = newPassword.value.trim()
  const confirm = confirmPassword.value.trim()

  if (next.length < 8) {
    formError.value = t('auth.passwordTooShort')
    return
  }

  if (next !== confirm) {
    formError.value = t('auth.passwordMismatch')
    return
  }

  if (!auth.accessToken) {
    formError.value = t('auth.notSignedIn')
    return
  }

  isSubmitting.value = true
  try {
    const current =
      auth.mustChangePassword ? undefined : currentPassword.value.trim()

    const result = await changePassword(auth.accessToken, next, current)
    auth.clearMustChangePassword()
    successMessage.value = result.message
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    setTimeout(() => {
      void navigateTo(localePath('/app/profile'))
    }, 800)
  } catch (error) {
    if (error instanceof ApiError) {
      formError.value = error.message
    } else {
      formError.value = t('common.serverError')
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-md">
    <NuxtLink
      v-if="!auth.mustChangePassword"
      :to="localePath('/app/profile')"
      class="ui-link-back"
    >
      {{ $t('auth.backToProfile') }}
    </NuxtLink>

    <div class="ui-card-lg">
      <h1 class="ui-page-title">{{ $t('auth.changePasswordTitle') }}</h1>
      <p v-if="auth.mustChangePassword" class="ui-alert-warning mt-2">
        {{ $t('auth.mustChangeHint') }}
      </p>
      <p v-else class="ui-page-subtitle mt-1">
        {{ $t('auth.changePasswordHint') }}
      </p>

      <p v-if="formError" class="ui-alert-error mt-4" role="alert">
        {{ formError }}
      </p>
      <p v-if="successMessage" class="ui-alert-success mt-4" role="status">
        {{ successMessage }}
      </p>

      <form class="ui-form mt-6" @submit.prevent="handleSubmit">
        <label v-if="!auth.mustChangePassword" class="ui-field">
          {{ $t('auth.currentPassword') }}
          <input
            v-model="currentPassword"
            type="password"
            required
            autocomplete="current-password"
            class="ui-input"
          />
        </label>
        <label class="ui-field">
          {{ $t('auth.newPassword') }}
          <input
            v-model="newPassword"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="ui-input"
          />
          <span class="ui-hint mt-1 block">{{ $t('auth.passwordMinHint') }}</span>
        </label>
        <label class="ui-field">
          {{ $t('auth.confirmPassword') }}
          <input
            v-model="confirmPassword"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="ui-input"
          />
        </label>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="ui-btn-primary ui-btn-lg ui-btn-block"
        >
          {{ isSubmitting ? $t('common.saving') : $t('auth.updatePassword') }}
        </button>
      </form>
    </div>
  </section>
</template>
