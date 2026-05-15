<script setup lang="ts">
import { animalGallery } from '@/data/animals.mock'
</script>

<template>
  <section>
    <header class="mb-4">
      <h1 class="text-xl font-semibold tracking-tight">Animals</h1>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Browse photos — no account required. Sign in to like and comment.
      </p>
    </header>

    <ul class="grid grid-cols-2 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <li
        v-for="animal in animalGallery"
        :key="animal.id"
        class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <img
          :src="animal.imageUrl"
          :alt="animal.name"
          class="aspect-square w-full object-cover"
          loading="lazy"
        />
        <div class="p-3">
          <h2 class="font-medium">{{ animal.name }}</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">{{ animal.species }}</p>
        </div>
      </li>
    </ul>
  </section>
</template>
