<script setup lang="ts">
import { formatPetAge } from '~/lib/pet-age'
import { pickPetGreeting } from '~/lib/pick-pet-greeting'
import type { GalleryPet } from '~/types/gallery'
import type { Pet } from '~/types/pet'

const props = withDefaults(
  defineProps<{
    pet: Pet | GalleryPet
    showDetails?: boolean
    showGreeting?: boolean
    showAbout?: boolean
  }>(),
  {
    showDetails: true,
    showGreeting: true,
    showAbout: true,
  },
)

const { locale, t } = useI18n()
const { petSexLabel } = useEnumLabels()

const ageLabel = computed(() => formatPetAge(props.pet.dateOfBirth, locale.value))

const breedLabel = computed(() => props.pet.breed?.label ?? t('myPets.notSpecified'))

const displayGreeting = computed(() => pickPetGreeting(props.pet, locale.value))
</script>

<template>
  <section class="ui-pet-profile">
    <dl v-if="showDetails" class="ui-pet-details">
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

    <div v-if="showGreeting && displayGreeting" class="ui-pet-meet">
      <p class="ui-pet-hero-greeting-label">{{ $t('pet.greetingLabel') }}</p>
      <blockquote class="ui-pet-greeting">
        <p>{{ displayGreeting }}</p>
      </blockquote>
    </div>

    <div v-if="showAbout && pet.description" class="ui-pet-description">
      <h2 class="ui-section-title">{{ $t('pet.about') }}</h2>
      <p class="ui-prose whitespace-pre-wrap">{{ pet.description }}</p>
    </div>
  </section>
</template>
