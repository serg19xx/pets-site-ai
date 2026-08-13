<script setup lang="ts">
import UserAvatar from '~/components/UserAvatar.vue'
import type { PublicMember } from '~/types/public-member'

const props = defineProps<{
  member: PublicMember
}>()

const localePath = useLocalePath()

const initial = computed(() => {
  const name = props.member.displayName.trim()
  return name ? name.charAt(0).toUpperCase() : '?'
})
</script>

<template>
  <div class="ui-friend-row">
    <NuxtLink :to="localePath(`/members/${member.id}`)" class="ui-friend-row-link">
      <UserAvatar :avatar-url="member.avatarUrl" :label="initial" size="sm" />
      <span class="ui-list-link-title min-w-0 truncate">{{ member.displayName }}</span>
    </NuxtLink>
    <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <slot />
    </div>
  </div>
</template>
