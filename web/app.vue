<script setup lang="ts">
const getRouteBaseName = useRouteBaseName()

/** Keep the same page instance when only the locale prefix changes (/feed ↔ /fr/feed). */
function pageKey(route: ReturnType<typeof useRoute>) {
  const base = getRouteBaseName(route) ?? route.path
  return `${base}:${JSON.stringify(route.params)}`
}
</script>

<template>
  <NuxtLayout>
    <NuxtPage :page-key="pageKey" />
  </NuxtLayout>
</template>
