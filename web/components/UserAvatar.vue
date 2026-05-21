<script setup lang="ts">
import { computed } from 'vue'

import { mediaUrl } from '~/lib/media'

const props = withDefaults(
  defineProps<{
    avatarUrl?: string | null
    label: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'header'
  }>(),
  {
    avatarUrl: null,
    size: 'md',
  },
)

const imageSrc = computed(() => mediaUrl(props.avatarUrl))

const sizeClass = computed(() => {
  if (props.size === 'xs') {
    return 'ui-avatar-xs'
  }
  if (props.size === 'sm') {
    return 'ui-avatar-sm'
  }
  if (props.size === 'lg') {
    return 'ui-avatar-lg'
  }
  if (props.size === 'header') {
    return 'ui-avatar-header'
  }
  return 'ui-avatar-md'
})
</script>

<template>
  <span class="ui-avatar-initials" :class="sizeClass">
    <img
      v-if="imageSrc"
      :src="imageSrc"
      alt=""
      class="h-full w-full object-cover"
    />
    <span v-else>{{ label }}</span>
  </span>
</template>
