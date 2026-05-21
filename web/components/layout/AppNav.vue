<script setup lang="ts">
import { UI_NAV_ICONS } from '~/lib/ui-icons'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const navItems = computed(() => [
  { path: localePath('/'), label: t('nav.animals'), icon: UI_NAV_ICONS.animals },
  { path: localePath('/feed'), label: t('nav.feed'), icon: UI_NAV_ICONS.feed },
  { path: localePath('/learn'), label: t('nav.learn'), icon: UI_NAV_ICONS.learn },
])

function isActive(path: string) {
  if (path === localePath('/')) {
    return route.path === path || route.path === `${path}/`
  }
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<template>
  <nav class="w-56 shrink-0 p-4">
    <ul class="ui-nav-list">
      <li v-for="item in navItems" :key="item.path">
        <NuxtLink
          :to="item.path"
          class="ui-nav-item"
          :class="{ 'ui-nav-item-active': isActive(item.path) }"
        >
          <Icon :icon="item.icon" class="ui-icon-md" aria-hidden="true" />
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
