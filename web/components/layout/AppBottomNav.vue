<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'

import { UI_NAV_ICONS } from '~/lib/ui-icons'

const { t } = useI18n()
const route = useRoute()
const {
  bottomPrimaryItems,
  bottomExtraItems,
  utilityItems,
  isActive,
} = useAppNav()

const isMenuOpen = ref(false)
const menuRootRef = ref<HTMLElement | null>(null)

const isMenuSectionActive = computed(
  () =>
    bottomExtraItems.value.some((item) => isActive(item)) ||
    utilityItems.value.some((item) => isActive(item)),
)

function closeMenu() {
  isMenuOpen.value = false
}

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

onClickOutside(menuRootRef, closeMenu)

watch(
  () => route.fullPath,
  () => {
    closeMenu()
  },
)
</script>

<template>
  <nav class="ui-bottom-nav lg:hidden" aria-label="Main navigation">
    <ul class="ui-bottom-nav-list">
      <li v-for="item in bottomPrimaryItems" :key="item.id" class="flex min-w-0 flex-1">
        <NuxtLink
          :to="item.path"
          class="ui-bottom-nav-item"
          :class="{ 'ui-bottom-nav-item-active': isActive(item) }"
        >
          <Icon :icon="item.icon" class="ui-icon-xl" aria-hidden="true" />
          <span class="ui-bottom-nav-label">{{ item.label }}</span>
        </NuxtLink>
      </li>

      <li ref="menuRootRef" class="relative flex min-w-0 flex-1">
        <button
          type="button"
          class="ui-bottom-nav-item w-full"
          :class="{ 'ui-bottom-nav-item-active': isMenuSectionActive || isMenuOpen }"
          :aria-label="$t('nav.menu')"
          :aria-expanded="isMenuOpen"
          aria-haspopup="menu"
          @click="toggleMenu"
        >
          <Icon :icon="UI_NAV_ICONS.more" class="ui-icon-xl" aria-hidden="true" />
          <span class="ui-bottom-nav-label">{{ t('nav.menu') }}</span>
        </button>

        <ul
          v-show="isMenuOpen"
          class="ui-menu ui-bottom-nav-more"
          role="menu"
        >
          <li v-for="item in bottomExtraItems" :key="item.id">
            <NuxtLink
              :to="item.path"
              class="ui-menu-item"
              :class="{ 'ui-nav-item-active': isActive(item) }"
              role="menuitem"
              @click="closeMenu"
            >
              <Icon :icon="item.icon" class="ui-icon-md" aria-hidden="true" />
              {{ item.label }}
            </NuxtLink>
          </li>
          <li
            v-if="bottomExtraItems.length > 0"
            class="ui-bottom-nav-more-divider"
            aria-hidden="true"
          />
          <li v-for="item in utilityItems" :key="item.id">
            <NuxtLink
              :to="item.path"
              class="ui-menu-item"
              :class="{ 'ui-nav-item-active': isActive(item) }"
              role="menuitem"
              @click="closeMenu"
            >
              <Icon :icon="item.icon" class="ui-icon-md" aria-hidden="true" />
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>
