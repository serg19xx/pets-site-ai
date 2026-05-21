<script setup lang="ts">
import PetAvatar from '~/components/PetAvatar.vue'
import UserAvatar from '~/components/UserAvatar.vue'
import { ApiError } from '~/lib/auth-api'
import { fetchGalleryMember } from '~/lib/pets-api'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
import type { GalleryPet } from '~/types/gallery'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const route = useRoute()
const memberId = computed(() => Number(route.params.id))

const { data: profile, error: loadError, pending: isLoading } = await useAsyncData(
  () => `gallery-member-${memberId.value}-${locale.value}`,
  async () => {
    const id = memberId.value
    if (!Number.isInteger(id) || id < 1) {
      throw new ApiError(t('member.invalidId'), 400)
    }
    return fetchGalleryMember(id)
  },
  { watch: [memberId, locale] },
)

const member = computed(() => profile.value?.member)
const pets = computed(() => profile.value?.pets ?? [])

const memberInitial = computed(() => {
  const name = member.value?.displayName.trim() ?? ''
  return name ? name.charAt(0).toUpperCase() : '?'
})

const errorMessage = computed(() => {
  if (!loadError.value) {
    return ''
  }
  const err = loadError.value
  if (err instanceof ApiError && err.status === 404) {
    return t('member.notFound')
  }
  if (err instanceof ApiError) {
    return err.message
  }
  return t('member.loadError')
})

const pageTitle = computed(() =>
  member.value
    ? t('meta.member.titleNamed', { name: member.value.displayName })
    : t('meta.member.title'),
)

const pageDescription = computed(() =>
  member.value
    ? t('meta.member.descriptionNamed', { name: member.value.displayName })
    : t('meta.member.description'),
)

const canonicalPath = computed(() => localePath(`/members/${memberId.value}`))

usePageSeo({
  title: pageTitle,
  description: pageDescription,
  path: canonicalPath,
})

function speciesSubtitle(animal: GalleryPet) {
  const b = animal.breed?.label
  return b ? `${animal.species.label} · ${b}` : animal.species.label
}

function petPath(id: number) {
  return localePath(`/animals/${id}`)
}
</script>

<template>
  <section class="mx-auto max-w-lg">
    <div class="mb-4">
      <NuxtLink
        :to="localePath('/')"
        class="ui-link-back mb-0! inline-flex"
      >
        <Icon :icon="UI_ACTION_ICONS.back" class="ui-icon-sm" aria-hidden="true" />
        {{ $t('member.backToGallery') }}
      </NuxtLink>
    </div>

    <p v-if="isLoading" class="ui-loading">{{ $t('member.loading') }}</p>
    <p
      v-else-if="errorMessage"
      class="ui-alert-error"
      role="alert"
    >
      {{ errorMessage }}
    </p>

    <template v-else-if="member">
      <header class="ui-member-header">
        <UserAvatar
          :avatar-url="member.avatarUrl"
          :label="memberInitial"
          size="lg"
        />
        <div>
          <h1 class="ui-h1">{{ member.displayName }}</h1>
          <p class="ui-page-subtitle mt-1">{{ $t('member.subtitle') }}</p>
        </div>
      </header>

      <section class="mt-8">
        <h2 class="ui-h3">{{ $t('member.petsHeading') }}</h2>
        <p v-if="pets.length === 0" class="ui-empty mt-4">
          {{ $t('member.emptyPets') }}
        </p>
        <ul v-else class="ui-gallery-grid mt-4">
          <li v-for="animal in pets" :key="animal.id" class="ui-gallery-card">
            <NuxtLink :to="petPath(animal.id)" class="ui-gallery-card-link">
              <div class="ui-gallery-card-media">
                <PetAvatar :pet="animal" />
              </div>
              <div class="ui-gallery-card-body">
                <h3 class="ui-gallery-card-title">{{ animal.name }}</h3>
                <p class="ui-gallery-card-meta">
                  {{ speciesSubtitle(animal) }}
                </p>
              </div>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>
