<script setup lang="ts">
import { UI_NAV_ICONS } from '~/lib/ui-icons'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const navItems = computed(() => [
  { path: localePath('/'), label: t('nav.animals'), icon: UI_NAV_ICONS.animals },
  { path: localePath('/feed'), label: t('nav.feed'), icon: UI_NAV_ICONS.feed },
  { path: localePath('/marketplace'), label: t('nav.marketplace'), icon: UI_NAV_ICONS.marketplace },
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
  <nav class="ui-bottom-nav lg:hidden" aria-label="Main navigation">
    <ul class="ui-bottom-nav-list">
      <li v-for="item in navItems" :key="item.path" class="flex flex-1">
        <NuxtLink
          :to="item.path"
          class="ui-bottom-nav-item"
          :class="{ 'ui-bottom-nav-item-active': isActive(item.path) }"
        >
          <Icon :icon="item.icon" class="ui-icon-xl" aria-hidden="true" />
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
