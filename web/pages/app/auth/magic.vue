<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { ApiError, magicLogin } from '~/lib/auth-api'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'app',
})

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()

const status = ref<'loading' | 'success' | 'error'>('loading')
const message = ref('')

onMounted(async () => {
  const token = route.query.token
  if (typeof token !== 'string' || !token) {
    status.value = 'error'
    message.value = t('auth.invalidLink')
    return
  }

  try {
    const session = await magicLogin(token)
    auth.setSession(session)
    status.value = 'success'
    message.value = t('auth.mustChangeHint')

    if (session.mustChangePassword) {
      await navigateTo(localePath('/app/auth/change-password'))
    } else {
      await navigateTo(localePath('/app/profile'))
    }
  } catch (error) {
    status.value = 'error'
    message.value =
      error instanceof ApiError ? error.message : t('pet.loadError')
  }
})
</script>

<template>
  <section class="mx-auto max-w-md ui-text-center-muted">
    <p v-if="status === 'loading'" class="ui-loading">
      {{ $t('auth.magicLoading') }}
    </p>
    <p v-else-if="status === 'success'" class="ui-alert-success">
      {{ message }}
    </p>
    <p v-else class="ui-alert-error-lg">
      {{ message }}
    </p>
    <NuxtLink :to="localePath('/login')" class="ui-link ui-link-block">
      {{ $t('auth.magicGoLogin') }}
    </NuxtLink>
  </section>
</template>
