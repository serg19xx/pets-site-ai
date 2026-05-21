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
  <p class="ui-pet-member">
    <span class="ui-pet-member-label">{{ $t('pet.sharedBy') }}</span>
    <NuxtLink
      :to="localePath(`/members/${member.id}`)"
      class="ui-pet-member-link"
      :aria-label="$t('pet.memberProfileAria', { name: member.displayName })"
    >
      <UserAvatar
        :avatar-url="member.avatarUrl"
        :label="initial"
        size="xs"
      />
      <span class="ui-pet-member-name">{{ member.displayName }}</span>
    </NuxtLink>
  </p>
</template>
