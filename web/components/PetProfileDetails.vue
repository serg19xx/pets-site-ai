<script setup lang="ts">
import { formatPetAge } from '~/lib/pet-age'
import type { GalleryPet } from '~/types/gallery'
import type { Pet } from '~/types/pet'

const props = defineProps<{
  pet: Pet | GalleryPet
}>()

const { locale, t } = useI18n()
const { petSexLabel } = useEnumLabels()

const ageLabel = computed(() => formatPetAge(props.pet.dateOfBirth, locale.value))

const breedLabel = computed(() => props.pet.breed?.label ?? t('myPets.notSpecified'))
</script>

<template>
  <section class="ui-pet-profile">
    <dl class="ui-pet-details">
      <div class="ui-pet-details-row">
        <dt>{{ $t('myPets.species') }}</dt>
        <dd>{{ pet.species.label }}</dd>
      </div>
      <div class="ui-pet-details-row">
        <dt>{{ $t('myPets.breed') }}</dt>
        <dd>{{ breedLabel }}</dd>
      </div>
      <div class="ui-pet-details-row">
        <dt>{{ $t('myPets.sex') }}</dt>
        <dd>{{ petSexLabel(pet.sex) }}</dd>
      </div>
      <div class="ui-pet-details-row">
        <dt>{{ $t('profile.dateOfBirth') }}</dt>
        <dd>{{ pet.dateOfBirth }}</dd>
      </div>
      <div class="ui-pet-details-row">
        <dt>{{ $t('pet.age') }}</dt>
        <dd>{{ ageLabel }}</dd>
      </div>
    </dl>

    <blockquote v-if="pet.greeting" class="ui-pet-greeting">
      <p>{{ pet.greeting }}</p>
    </blockquote>

    <div v-if="pet.description" class="ui-pet-description">
      <h2 class="ui-section-title">{{ $t('pet.about') }}</h2>
      <p class="ui-prose whitespace-pre-wrap">{{ pet.description }}</p>
    </div>
  </section>
</template>
