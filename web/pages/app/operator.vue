<script setup lang="ts">
/** Legacy bookmark: send admins to the admin console; members back to profile. */
definePageMeta({
  layout: 'default',
  middleware: 'auth',
  ssr: false,
})

const config = useRuntimeConfig()
const localePath = useLocalePath()
const auth = useAuthStore()

onMounted(() => {
  if (auth.user?.isAdmin) {
    auth.signOut()
    window.location.href = String(config.public.adminUrl || 'http://localhost:3001')
    return
  }
  void navigateTo(localePath('/app/profile'))
})
</script>

<template>
  <section class="ui-page-container">
    <p class="ui-loading">{{ $t('common.loading') }}</p>
  </section>
</template>
