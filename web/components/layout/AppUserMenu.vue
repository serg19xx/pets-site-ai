<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'

import UserAvatar from '~/components/UserAvatar.vue'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()

const MENU_WIDTH = 192
const MENU_GAP = 8
const VIEWPORT_PADDING = 8

const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuPosition = ref({ top: '0px', left: '0px' })

function updateMenuPosition() {
  if (!rootRef.value) {
    return
  }
  const anchor = rootRef.value.getBoundingClientRect()
  const menuWidth = menuRef.value?.offsetWidth ?? MENU_WIDTH
  let left = anchor.right - menuWidth
  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, window.innerWidth - menuWidth - VIEWPORT_PADDING),
  )
  menuPosition.value = {
    top: `${anchor.bottom + MENU_GAP}px`,
    left: `${left}px`,
  }
}

function bindPositionListeners() {
  window.addEventListener('resize', updateMenuPosition)
  window.addEventListener('scroll', updateMenuPosition, true)
}

function unbindPositionListeners() {
  window.removeEventListener('resize', updateMenuPosition)
  window.removeEventListener('scroll', updateMenuPosition, true)
}

onClickOutside([rootRef, menuRef], () => {
  isOpen.value = false
})

watch(isOpen, async (open) => {
  if (open) {
    await nextTick()
    updateMenuPosition()
    bindPositionListeners()
  } else {
    unbindPositionListeners()
  }
})

onUnmounted(() => {
  unbindPositionListeners()
})

function toggleMenu() {
  isOpen.value = !isOpen.value
}

function closeMenu() {
  isOpen.value = false
}

function signOut() {
  auth.signOut()
  closeMenu()
  void navigateTo(localePath('/'))
}
</script>

<template>
  <div ref="rootRef" class="ui-header-auth">
    <button
      type="button"
      class="ui-avatar-trigger ui-avatar-trigger--header"
      :aria-label="`Account menu: ${auth.displayName}`"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      @click="toggleMenu"
    >
      <UserAvatar
        :avatar-url="auth.user?.avatarUrl"
        :label="auth.avatarLabel"
        size="header"
      />
    </button>
  </div>

  <Teleport to="body">
    <div
      v-show="isOpen"
      ref="menuRef"
      class="ui-menu ui-header-user-menu fixed z-[100] w-48"
      :style="menuPosition"
      role="menu"
    >
      <NuxtLink
        :to="localePath('/app/profile')"
        class="ui-menu-item"
        role="menuitem"
        @click="closeMenu"
      >
        <Icon :icon="UI_ACTION_ICONS.user" class="ui-icon-sm" aria-hidden="true" />
        {{ t('auth.profile') }}
      </NuxtLink>
      <NuxtLink
        :to="localePath('/app/my-pets')"
        class="ui-menu-item"
        role="menuitem"
        @click="closeMenu"
      >
        <Icon :icon="UI_ACTION_ICONS.pets" class="ui-icon-sm" aria-hidden="true" />
        {{ t('auth.myPets') }}
      </NuxtLink>
      <button
        type="button"
        class="ui-menu-item ui-menu-item-danger w-full border-t border-[var(--ui-border)]"
        role="menuitem"
        @click="signOut"
      >
        <Icon :icon="UI_ACTION_ICONS.logout" class="ui-icon-sm" aria-hidden="true" />
        {{ t('auth.logOut') }}
      </button>
    </div>
  </Teleport>
</template>
