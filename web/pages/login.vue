<script setup lang="ts">
import { ApiError, loginUser } from '~/lib/auth-api'
import { resolveSameOriginRedirect } from '~/lib/same-origin-redirect'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'default',
})

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()

usePageSeo({
  title: computed(() => t('meta.login.title')),
  description: computed(() => t('meta.login.description')),
  noindex: true,
})

const email = ref('')
const password = ref('')
const formError = ref('')
const isSubmitting = ref(false)
const isReady = ref(false)

const redirectTarget = computed(() =>
  resolveSameOriginRedirect(
    typeof route.query.redirect === 'string' ? route.query.redirect : null,
  ),
)

onMounted(() => {
  if (route.query.signout === '1') {
    auth.signOut()
    void router.replace({ path: localePath('/login') })
  }
  auth.hydrateFromStorage()
  if (auth.user?.isAdmin) {
    auth.signOut()
  }
  if (route.query.adminOnly === '1') {
    const adminUrl = String(config.public.adminUrl || 'http://localhost:3001')
    formError.value = t('auth.adminUseAdminApp', { url: adminUrl })
  }
  isReady.value = true
})

function signOutOnPage() {
  auth.signOut()
  void router.replace({ path: localePath('/login') })
}

async function handleSubmit() {
  formError.value = ''
  isSubmitting.value = true
  try {
    const session = await loginUser(email.value.trim(), password.value)
    auth.setSession(session)

    if (session.mustChangePassword) {
      await navigateTo(localePath('/app/auth/change-password'))
      return
    }

    await navigateTo(redirectTarget.value)
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
</script>

<template>
  <section class="mx-auto max-w-md">
    <h1 class="ui-page-title">{{ $t('auth.loginTitle') }}</h1>
    <p class="ui-page-subtitle mt-1">
      {{ $t('auth.loginSubtitle') }}
    </p>

    <div
      v-if="isReady && auth.isAuthenticated"
      class="ui-card-muted mt-4"
    >
      <p class="ui-body">
        {{ $t('auth.signedInAs', { name: auth.displayName }) }}
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <NuxtLink
          :to="localePath('/')"
          class="ui-btn-primary ui-btn-sm"
        >
          {{ $t('auth.goToGallery') }}
        </NuxtLink>
        <button
          type="button"
          class="ui-btn-secondary ui-btn-sm"
          @click="signOutOnPage"
        >
          {{ $t('auth.signOut') }}
        </button>
      </div>
    </div>

    <form v-else-if="isReady" class="mt-6 space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label for="email" class="ui-label-spaced">{{ $t('auth.email') }}</label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          required
          class="ui-input"
        />
      </div>

      <div>
        <label for="password" class="ui-label-spaced">{{ $t('auth.password') }}</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          class="ui-input"
        />
      </div>

      <p
        v-if="formError"
        class="ui-alert-error"
        role="alert"
      >
        {{ formError }}
      </p>

      <button
        type="submit"
        class="ui-btn-primary ui-btn-lg ui-btn-block"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? $t('auth.signingIn') : $t('auth.logIn') }}
      </button>
    </form>

    <p class="ui-text-center-muted mt-4">
      <NuxtLink :to="localePath('/')" class="ui-link">
        {{ $t('auth.backToGallery') }}
      </NuxtLink>
      <span class="mx-2">·</span>
      <NuxtLink
        :to="localePath('/app/auth?mode=register')"
        class="ui-link"
      >
        {{ $t('auth.createAccount') }}
      </NuxtLink>
    </p>
  </section>
</template>
