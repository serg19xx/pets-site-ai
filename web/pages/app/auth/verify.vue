<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { ApiError, verifyEmail } from '~/lib/auth-api'

definePageMeta({
  layout: 'app',
})

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

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
    const result = await verifyEmail(token)
    status.value = 'success'
    message.value = result.message
    setTimeout(() => {
      void navigateTo({ path: localePath('/login'), query: { verified: '1' } })
    }, 2000)
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
      {{ $t('auth.verifyLoading') }}
    </p>
    <p v-else-if="status === 'success'" class="ui-alert-success">
      {{ message }}
    </p>
    <p v-else class="ui-alert-error-lg">
      {{ message }}
    </p>
    <NuxtLink :to="localePath('/login')" class="ui-link ui-link-block">
      {{ $t('auth.verifyGoLogin') }}
    </NuxtLink>
  </section>
</template>
