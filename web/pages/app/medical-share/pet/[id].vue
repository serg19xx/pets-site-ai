<script setup lang="ts">
import PetMedicalShareView from '~/components/PetMedicalShareView.vue'
import { ApiError } from '~/lib/auth-api'
import { fetchMedicalShareByPet } from '~/lib/pets-api'
import { useAuthStore } from '~/stores/auth'
import type { MedicalShareView } from '~/types/pet-medical'

definePageMeta({
  layout: 'app',
  middleware: ['auth', 'block-admin'],
  ssr: false,
})

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()

const petId = computed(() => Number(route.params.id))

usePageSeo({
  title: () => t('pet.medicalShareTitle'),
  description: () => t('pet.medicalShareDescription'),
  noindex: true,
})

const share = ref<MedicalShareView | null>(null)
const isLoading = ref(true)
const errorMessage = ref('')
const expired = ref(false)

async function load() {
  const accessToken = auth.accessToken
  if (!accessToken || !Number.isInteger(petId.value) || petId.value < 1) {
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  expired.value = false
  try {
    share.value = await fetchMedicalShareByPet(petId.value, accessToken)
  } catch (err) {
    share.value = null
    if (err instanceof ApiError && err.status === 410) {
      expired.value = true
      errorMessage.value = t('pet.medicalShareExpired')
    } else if (err instanceof ApiError) {
      errorMessage.value = err.message
    } else {
      errorMessage.value = t('pet.medicalShareError')
    }
  } finally {
    isLoading.value = false
  }
}

watch(
  [petId, () => auth.accessToken],
  () => {
    void load()
  },
  { immediate: true },
)
</script>

<template>
  <section class="ui-page-container">
    <NuxtLink :to="localePath('/')" class="ui-link-back">
      {{ $t('pet.backToGallery') }}
    </NuxtLink>
    <h1 class="ui-h1 mt-4">
      {{ share ? share.pet.name : $t('pet.medicalShareTitle') }}
    </h1>
    <p v-if="isLoading" class="ui-loading mt-4">{{ $t('common.loading') }}</p>
    <p v-else-if="errorMessage" class="ui-alert-error mt-4" role="alert">
      {{ errorMessage }}
    </p>
    <PetMedicalShareView v-else-if="share" class="mt-4" :share="share" />
    <p v-if="expired" class="ui-hint mt-3">
      {{ $t('pet.medicalShareExpiredHint') }}
    </p>
  </section>
</template>
