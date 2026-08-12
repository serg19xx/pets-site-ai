<script setup lang="ts">
import { ApiError } from '~/lib/auth-api'
import {
  approveMedicalRequest,
  declineMedicalRequest,
  listOwnerMedicalRequests,
} from '~/lib/pets-api'
import { useAuthStore } from '~/stores/auth'
import type { OwnerMedicalRequest } from '~/types/pet-medical'

const props = defineProps<{
  petId: number
}>()

const { t } = useI18n()
const auth = useAuthStore()
const authUiReady = useAuthUiReady()
const { formatIso } = useDateTime()

const requests = ref<OwnerMedicalRequest[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const actingId = ref<number | null>(null)

async function load() {
  const token = auth.accessToken
  if (!token || !authUiReady.value) {
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  try {
    const data = await listOwnerMedicalRequests(props.petId, token)
    requests.value = data.requests
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('myPets.medical.requestsLoadError')
  } finally {
    isLoading.value = false
  }
}

watch(
  [authUiReady, () => auth.accessToken, () => props.petId],
  () => {
    void load()
  },
  { immediate: true },
)

async function decide(item: OwnerMedicalRequest, action: 'approve' | 'decline') {
  const token = auth.accessToken
  if (!token || actingId.value !== null) {
    return
  }
  actingId.value = item.id
  errorMessage.value = ''
  try {
    await (action === 'approve'
      ? approveMedicalRequest(props.petId, item.id, token)
      : declineMedicalRequest(props.petId, item.id, token))
    requests.value = requests.value.filter((row) => row.id !== item.id)
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('myPets.medical.requestsActionError')
  } finally {
    actingId.value = null
  }
}

</script>

<template>
  <section v-if="authUiReady" class="ui-card space-y-3 p-4">
    <h2 class="text-base font-semibold">{{ $t('myPets.medical.requestsTitle') }}</h2>
    <p class="ui-hint">{{ $t('myPets.medical.requestsHint') }}</p>

    <p v-if="errorMessage" class="ui-alert-error" role="alert">
      {{ errorMessage }}
    </p>
    <p v-else-if="isLoading" class="ui-hint">{{ $t('common.loading') }}</p>
    <p v-else-if="requests.length === 0" class="ui-hint">
      {{ $t('myPets.medical.requestsEmpty') }}
    </p>

    <ul v-else class="space-y-3">
      <li
        v-for="item in requests"
        :key="item.id"
        class="rounded-lg border border-(--ui-border) p-3"
      >
        <p class="font-medium">{{ item.requesterLabel }}</p>
        <p class="ui-hint mt-1">{{ formatIso(item.createdAt) }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="ui-btn-primary ui-btn-sm"
            :disabled="actingId !== null"
            @click="decide(item, 'approve')"
          >
            {{
              actingId === item.id
                ? $t('common.saving')
                : $t('myPets.medical.approve')
            }}
          </button>
          <button
            type="button"
            class="ui-btn-secondary ui-btn-sm"
            :disabled="actingId !== null"
            @click="decide(item, 'decline')"
          >
            {{ $t('myPets.medical.decline') }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>
