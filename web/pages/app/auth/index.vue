<script setup lang="ts">
import { computed, ref } from 'vue'

import { ApiError, forgotPassword, registerUser } from '~/lib/auth-api'
import { USER_GENDERS, type UserGender } from '~/types/user'
import { useEnumLabels } from '~/composables/useEnumLabels'

definePageMeta({
  layout: 'app',
  middleware: 'auth-register',
})

type AuthMode = 'register' | 'reset'

const { t } = useI18n()
const localePath = useLocalePath()
const { genderLabel } = useEnumLabels()
const route = useRoute()
const router = useRouter()

const tabs = computed(() => [
  { mode: 'register' as const, label: t('auth.signUp') },
  { mode: 'reset' as const, label: t('auth.passwordTab') },
])

const mode = computed<AuthMode>(() => {
  const value = route.query.mode
  return value === 'reset' ? 'reset' : 'register'
})

const registerSuccess = ref('')
const resetMessage = ref('')
const isSubmitting = ref(false)
const formError = ref('')

const email = ref('')
const fullName = ref('')
const nickname = ref('')
const gender = ref<UserGender>('prefer_not_to_say')
const dateOfBirth = ref('')
const phone = ref('')

function setMode(next: AuthMode) {
  registerSuccess.value = ''
  resetMessage.value = ''
  formError.value = ''
  const invite =
    typeof route.query.invite === 'string' ? route.query.invite : undefined
  void router.replace({
    path: localePath('/app/auth'),
    query: { mode: next, ...(invite ? { invite } : {}) },
  })
}

const betaInvite = computed(() => {
  const value = route.query.invite
  return typeof value === 'string' && value.trim() ? value.trim() : null
})

async function handleRegister() {
  formError.value = ''
  registerSuccess.value = ''
  isSubmitting.value = true
  try {
    const result = await registerUser({
      fullName: fullName.value,
      nickname: nickname.value.trim() || undefined,
      gender: gender.value,
      dateOfBirth: dateOfBirth.value,
      phone: phone.value.trim() || undefined,
      email: email.value,
      ...(betaInvite.value ? { betaInvite: betaInvite.value } : {}),
    })
    registerSuccess.value = result.message
    await navigateTo(localePath('/login'))
  } catch (error) {
    if (error instanceof ApiError) {
      formError.value = error.message
    } else {
      formError.value = t('auth.serverError')
    }
  } finally {
    isSubmitting.value = false
  }
}

async function handleReset() {
  formError.value = ''
  resetMessage.value = ''
  isSubmitting.value = true
  try {
    const result = await forgotPassword(email.value)
    resetMessage.value = result.message
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

const heading = computed(() =>
  mode.value === 'register' ? t('auth.registerTitle') : t('auth.resetTitle'),
)
</script>

<template>
  <section class="mx-auto max-w-md">
    <NuxtLink
      :to="localePath('/')"
      class="ui-link-back"
    >
      {{ $t('common.back') }}
    </NuxtLink>

    <div class="ui-card-lg">
      <nav class="ui-tabs" aria-label="Authentication">
        <button
          v-for="tab in tabs"
          :key="tab.mode"
          type="button"
          class="ui-tab"
          :class="{ 'ui-tab-active': mode === tab.mode }"
          @click="setMode(tab.mode)"
        >
          {{ tab.label }}
        </button>
      </nav>

      <h1 class="ui-page-title">{{ heading }}</h1>
      <p v-if="mode === 'register'" class="ui-page-subtitle mt-1">
        {{ $t('auth.registerHint') }}
        <NuxtLink :to="localePath('/login')" class="ui-link">
          {{ $t('auth.logIn') }}
        </NuxtLink>
      </p>
      <p
        v-if="mode === 'register' && betaInvite"
        class="mt-3 rounded-(--radius-control) border border-(--ui-border) bg-(--ui-surface-inset) px-3 py-2 text-sm text-stone-800 dark:text-stone-200"
      >
        {{ $t('invite.registerBanner') }}
      </p>

      <p
        v-if="registerSuccess"
        class="ui-alert-success mt-4"
        role="status"
      >
        {{ registerSuccess }}
      </p>

      <p
        v-if="formError"
        class="ui-alert-error mt-4"
        role="alert"
      >
        {{ formError }}
      </p>

      <form
        v-if="mode === 'register'"
        class="mt-6 space-y-4"
        @submit.prevent="handleRegister"
      >
        <label class="ui-field">
          {{ $t('profile.fullName') }}
          <input
            v-model="fullName"
            type="text"
            required
            autocomplete="name"
            class="ui-input"
          />
        </label>
        <label class="ui-field">
          {{ $t('profile.nickname') }}
          <input
            v-model="nickname"
            type="text"
            autocomplete="nickname"
            :placeholder="$t('common.optional')"
            class="ui-input"
          />
        </label>
        <label class="ui-field">
          {{ $t('profile.gender') }}
          <select
            v-model="gender"
            required
            class="ui-select"
          >
            <option v-for="g in USER_GENDERS" :key="g" :value="g">
              {{ genderLabel(g) }}
            </option>
          </select>
        </label>
        <div>
          <label class="ui-label-spaced" for="auth-date-of-birth">
            {{ $t('profile.dateOfBirth') }}
          </label>
          <input
            id="auth-date-of-birth"
            v-model="dateOfBirth"
            type="date"
            required
            class="ui-input"
          />
        </div>
        <label class="ui-field">
          {{ $t('profile.phone') }}
          <input
            v-model="phone"
            type="tel"
            autocomplete="tel"
            :placeholder="$t('common.optional')"
            class="ui-input"
          />
        </label>
        <label class="ui-field">
          {{ $t('auth.email') }}
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="ui-input"
          />
        </label>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="ui-btn-primary ui-btn-lg ui-btn-block"
        >
          {{ isSubmitting ? $t('auth.creatingAccount') : $t('auth.signUp') }}
        </button>
      </form>

      <form
        v-else
        class="mt-6 space-y-4"
        @submit.prevent="handleReset"
      >
        <p class="ui-body">
          {{ $t('auth.resetHint') }}
        </p>
        <p
          v-if="resetMessage"
          class="ui-alert-success"
          role="status"
        >
          {{ resetMessage }}
        </p>
        <label class="ui-field">
          {{ $t('auth.email') }}
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="ui-input"
          />
        </label>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="ui-btn-primary ui-btn-lg ui-btn-block"
        >
          {{ isSubmitting ? $t('auth.sendingReset') : $t('auth.sendReset') }}
        </button>
      </form>

      <p class="ui-text-center-muted mt-4">
        {{ $t('auth.alreadyHaveAccount') }}
        <NuxtLink :to="localePath('/login')" class="ui-link">
          {{ $t('auth.logIn') }}
        </NuxtLink>
      </p>
    </div>
  </section>
</template>
