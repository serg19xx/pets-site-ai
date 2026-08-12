<script setup lang="ts">
import PetPhotoGallery from '~/components/PetPhotoGallery.vue'
import { mediaUrl } from '~/lib/media'
import type { GalleryPetDossier } from '~/types/gallery'
import type { PetParentRecord } from '~/types/pet-parent'

const props = defineProps<{
  dossier: GalleryPetDossier
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const physicalRows = computed(() => {
  const d = props.dossier
  const rows: { label: string; value: string }[] = []
  if (d.weightKg != null) {
    rows.push({ label: t('myPets.weightKg'), value: String(d.weightKg) })
  }
  if (d.color?.trim()) {
    rows.push({ label: t('myPets.color'), value: d.color.trim() })
  }
  if (d.lengthCm != null) {
    rows.push({ label: t('myPets.lengthCm'), value: String(d.lengthCm) })
  }
  if (d.heightCm != null) {
    rows.push({ label: t('myPets.heightCm'), value: String(d.heightCm) })
  }
  if (d.markings?.trim()) {
    rows.push({ label: t('myPets.markings'), value: d.markings.trim() })
  }
  if (d.physicalNotes?.trim()) {
    rows.push({
      label: t('myPets.physicalNotes'),
      value: d.physicalNotes.trim(),
    })
  }
  return rows
})

const parents = computed(() => {
  const items: { title: string; parent: PetParentRecord }[] = []
  if (props.dossier.dam) {
    items.push({ title: t('myPets.pedigree.dam'), parent: props.dossier.dam })
  }
  if (props.dossier.sire) {
    items.push({ title: t('myPets.pedigree.sire'), parent: props.dossier.sire })
  }
  return items
})

const hasPedigree = computed(
  () => parents.value.length > 0 || Boolean(props.dossier.pedigreeNotes?.trim()),
)

function parentName(parent: PetParentRecord) {
  return parent.linkedPet?.name || parent.name || t('myPets.notSpecified')
}

function parentBreed(parent: PetParentRecord) {
  return parent.linkedPet?.breedLabel || parent.breedLabel || ''
}

function parentPhoto(parent: PetParentRecord) {
  return mediaUrl(parent.photoUrl || parent.linkedPet?.avatarUrl || null)
}

function parentPath(parent: PetParentRecord) {
  if (!parent.linkedPet) {
    return null
  }
  return localePath(parent.linkedPet.publicPath)
}
</script>

<template>
  <div class="ui-pet-dossier">
    <section v-if="physicalRows.length > 0" class="ui-pet-dossier-block">
      <h2 class="ui-section-title">{{ $t('pet.physicalHeading') }}</h2>
      <dl class="ui-pet-details mt-3">
        <div
          v-for="row in physicalRows"
          :key="row.label"
          class="ui-pet-details-row"
        >
          <dt>{{ row.label }}</dt>
          <dd class="whitespace-pre-wrap">{{ row.value }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="hasPedigree" class="ui-pet-dossier-block">
      <h2 class="ui-section-title">{{ $t('pet.pedigreeHeading') }}</h2>
      <ul v-if="parents.length > 0" class="ui-pet-pedigree-list">
        <li v-for="item in parents" :key="item.parent.role">
          <NuxtLink
            v-if="parentPath(item.parent)"
            :to="parentPath(item.parent)!"
            class="ui-pet-pedigree-card"
          >
            <img
              v-if="parentPhoto(item.parent)"
              :src="parentPhoto(item.parent)!"
              alt=""
              class="ui-pet-pedigree-photo"
            />
            <span v-else class="ui-pet-pedigree-fallback" aria-hidden="true">
              {{ parentName(item.parent).charAt(0) }}
            </span>
            <span class="ui-pet-friend-meta">
              <span class="ui-pet-friend-species">{{ item.title }}</span>
              <span class="ui-pet-friend-name">{{ parentName(item.parent) }}</span>
              <span v-if="parentBreed(item.parent)" class="ui-pet-friend-species">
                {{ parentBreed(item.parent) }}
              </span>
            </span>
          </NuxtLink>
          <div v-else class="ui-pet-pedigree-card ui-pet-pedigree-card--static">
            <img
              v-if="parentPhoto(item.parent)"
              :src="parentPhoto(item.parent)!"
              alt=""
              class="ui-pet-pedigree-photo"
            />
            <span v-else class="ui-pet-pedigree-fallback" aria-hidden="true">
              {{ parentName(item.parent).charAt(0) }}
            </span>
            <span class="ui-pet-friend-meta">
              <span class="ui-pet-friend-species">{{ item.title }}</span>
              <span class="ui-pet-friend-name">{{ parentName(item.parent) }}</span>
              <span v-if="parentBreed(item.parent)" class="ui-pet-friend-species">
                {{ parentBreed(item.parent) }}
              </span>
            </span>
          </div>
        </li>
      </ul>
      <p
        v-if="dossier.pedigreeNotes?.trim()"
        class="ui-prose mt-3 whitespace-pre-wrap"
      >
        {{ dossier.pedigreeNotes }}
      </p>
    </section>

    <PetPhotoGallery
      v-if="dossier.certificates.length > 0"
      :photos="dossier.certificates"
      :title="$t('pet.certificatesHeading')"
    />

    <section class="ui-pet-dossier-block">
      <h2 class="ui-section-title">{{ $t('pet.showsHeading') }}</h2>
      <p class="ui-hint mt-2">{{ $t('pet.showsComingSoon') }}</p>
    </section>

    <section class="ui-pet-dossier-block">
      <h2 class="ui-section-title">{{ $t('pet.ownerCircleHeading') }}</h2>
      <p class="ui-hint mt-2">{{ $t('pet.ownerCircleComingSoon') }}</p>
    </section>
  </div>
</template>
