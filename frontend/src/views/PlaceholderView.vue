<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <section class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
    <h1 class="text-lg font-semibold">{{ title }}</h1>
    <p v-if="description" class="mt-2 text-sm text-slate-600 dark:text-slate-400">
      {{ description }}
    </p>
    <p v-else class="mt-2 text-sm text-slate-500 dark:text-slate-400">Coming soon.</p>
  </section>
</template>
