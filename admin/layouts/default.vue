<script setup lang="ts">
const auth = useAuthStore()
const route = useRoute()

onMounted(() => {
  if (!auth.isHydrated) {
    auth.hydrateFromStorage()
  }
})

const showNav = computed(() => auth.isAuthenticated && route.path !== '/login')

function signOut() {
  auth.signOut()
  void navigateTo('/login')
}
</script>

<template>
  <div class="min-h-dvh">
    <header
      v-if="showNav"
      class="border-b border-zinc-200 bg-white"
    >
      <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <p class="text-sm font-semibold tracking-wide text-teal-800">PETS Admin</p>
        <nav class="flex items-center gap-2 text-sm">
          <NuxtLink
            to="/feedback"
            class="rounded px-2 py-1"
            :class="route.path.startsWith('/feedback') ? 'bg-teal-50 text-teal-900' : 'text-zinc-600 hover:bg-zinc-50'"
          >
            Feedback
          </NuxtLink>
          <NuxtLink
            to="/announcements"
            class="rounded px-2 py-1"
            :class="route.path.startsWith('/announcements') ? 'bg-teal-50 text-teal-900' : 'text-zinc-600 hover:bg-zinc-50'"
          >
            Announce
          </NuxtLink>
          <NuxtLink
            to="/testers"
            class="rounded px-2 py-1"
            :class="route.path.startsWith('/testers') ? 'bg-teal-50 text-teal-900' : 'text-zinc-600 hover:bg-zinc-50'"
          >
            Testers
          </NuxtLink>
          <NuxtLink
            to="/users"
            class="rounded px-2 py-1"
            :class="route.path.startsWith('/users') ? 'bg-teal-50 text-teal-900' : 'text-zinc-600 hover:bg-zinc-50'"
          >
            Users
          </NuxtLink>
          <NuxtLink
            to="/species"
            class="rounded px-2 py-1"
            :class="route.path.startsWith('/species') ? 'bg-teal-50 text-teal-900' : 'text-zinc-600 hover:bg-zinc-50'"
          >
            Species
          </NuxtLink>
        </nav>
        <div class="ml-auto flex items-center gap-3 text-sm text-zinc-600">
          <span>{{ auth.displayName }}</span>
          <button
            type="button"
            class="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50"
            @click="signOut"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>
