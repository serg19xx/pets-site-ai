<script setup lang="ts">
import { computed } from 'vue'

import { getDefaultPetAvatarDataUri } from '~/assets/animal_avatars'
import { mediaUrl } from '~/lib/media'
import type { GalleryPet, PetFriendSummary } from '~/types/gallery'
import type { Pet } from '~/types/pet'

const props = withDefaults(
  defineProps<{
    pet?: Pet | GalleryPet | PetFriendSummary | null
    /** When creating a pet (no `pet` yet), default art from species slug (e.g. `dog`). */
    speciesSlug?: string
    size?: 'sm' | 'md' | 'lg' | 'fill'
  }>(),
  {
    pet: null,
    speciesSlug: 'cat',
    size: 'md',
  },
)

const imageSrc = computed(() => mediaUrl(props.pet?.avatarUrl ?? null))

const fallbackSrc = computed(() => {
  const slug = props.pet?.species.slug ?? props.speciesSlug ?? 'cat'
  return getDefaultPetAvatarDataUri(slug)
})

const ariaLabel = computed(() => {
  const name = props.pet?.name?.trim()
  return name ? `${name} avatar` : 'Pet avatar'
})

const sizeClass = computed(() => {
  if (props.size === 'fill') {
    return 'ui-pet-avatar-fill'
  }
  if (props.size === 'sm') {
    return 'ui-pet-avatar-sm'
  }
  if (props.size === 'lg') {
    return 'ui-pet-avatar-lg'
  }
  return 'ui-pet-avatar-md'
})

const displayClass = computed(() => (props.size === 'fill' ? 'flex' : 'inline-flex'))

const ringClass = computed(() =>
  props.size === 'fill' ? 'ui-avatar-ring--bleed' : '',
)
</script>

<template>
  <span class="ui-avatar-ring" :class="[displayClass, sizeClass, ringClass]">
    <img
      :src="imageSrc || fallbackSrc"
      :alt="ariaLabel"
      class="h-full w-full object-cover"
    />
  </span>
</template>

