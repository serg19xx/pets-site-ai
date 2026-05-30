<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'

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

function onDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node | null
  if (!target) {
    return
  }
  if (rootRef.value?.contains(target) || menuRef.value?.contains(target)) {
    return
  }
  isOpen.value = false
}

watch(isOpen, async (open) => {
  if (open) {
    await nextTick()
    updateMenuPosition()
    bindPositionListeners()
    window.addEventListener('pointerdown', onDocumentPointerDown, true)
  } else {
    unbindPositionListeners()
    window.removeEventListener('pointerdown', onDocumentPointerDown, true)
  }
})

onUnmounted(() => {
  unbindPositionListeners()
  window.removeEventListener('pointerdown', onDocumentPointerDown, true)
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
      class="ui-menu ui-header-user-menu fixed z-100 w-48"
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
      <NuxtLink
        :to="localePath('/app/my-posts')"
        class="ui-menu-item"
        role="menuitem"
        @click="closeMenu"
      >
        <Icon :icon="UI_ACTION_ICONS.send" class="ui-icon-sm" aria-hidden="true" />
        {{ t('auth.myPosts') }}
      </NuxtLink>
      <NuxtLink
        :to="localePath('/app/my-listings')"
        class="ui-menu-item"
        role="menuitem"
        @click="closeMenu"
      >
        <Icon :icon="UI_ACTION_ICONS.star" class="ui-icon-sm" aria-hidden="true" />
        {{ t('auth.myListings') }}
      </NuxtLink>
      <NuxtLink
        :to="localePath('/app/marketplace-inquiries')"
        class="ui-menu-item"
        role="menuitem"
        @click="closeMenu"
      >
        <Icon :icon="UI_ACTION_ICONS.message" class="ui-icon-sm" aria-hidden="true" />
        {{ t('auth.listingMessages') }}
      </NuxtLink>
      <NuxtLink
        :to="localePath('/app/saved')"
        class="ui-menu-item"
        role="menuitem"
        @click="closeMenu"
      >
        <Icon :icon="UI_ACTION_ICONS.bookmark" class="ui-icon-sm" aria-hidden="true" />
        {{ t('auth.saved') }}
      </NuxtLink>
      <NuxtLink
        :to="localePath('/app/liked-pets')"
        class="ui-menu-item"
        role="menuitem"
        @click="closeMenu"
      >
        <Icon :icon="UI_ACTION_ICONS.heart" class="ui-icon-sm" aria-hidden="true" />
        {{ t('auth.likedPets') }}
      </NuxtLink>
      <button
        type="button"
        class="ui-menu-item ui-menu-item-danger w-full border-t border-(--ui-border)"
        role="menuitem"
        @click="signOut"
      >
        <Icon :icon="UI_ACTION_ICONS.logout" class="ui-icon-sm" aria-hidden="true" />
        {{ t('auth.logOut') }}
      </button>
    </div>
  </Teleport>
</template>
