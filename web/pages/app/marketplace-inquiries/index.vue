<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth',
  ssr: false,
})

const localePath = useLocalePath()

await navigateTo({
  path: localePath('/app/my-listings'),
  replace: true,
})
</script>

<template>
  <p class="ui-loading p-6">{{ $t('common.loading') }}</p>
</template>
