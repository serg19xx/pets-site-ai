<script setup lang="ts">
import { ApiError } from '~/lib/auth-api'
import { sendListingInquiry } from '~/lib/marketplace-inquiries-api'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  listingId: number
  sellerUserId: number
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()
const authUiReady = useAuthUiReady()

const messageBody = ref('')
const isSending = ref(false)
const formError = ref('')
const sentInquiryId = ref<number | null>(null)

const isOwner = computed(
  () => auth.isAuthenticated && auth.user?.id === props.sellerUserId,
)

const canSend = computed(
  () =>
    !isSending.value &&
    messageBody.value.trim().length > 0 &&
    auth.isAuthenticated &&
    !isOwner.value,
)

async function onSend() {
  const token = auth.accessToken
  if (!token || !canSend.value) {
    return
  }
  isSending.value = true
  formError.value = ''
  try {
    const thread = await sendListingInquiry(props.listingId, token, messageBody.value)
    sentInquiryId.value = thread.inquiry.id
    messageBody.value = ''
  } catch (err) {
    formError.value =
      err instanceof ApiError ? err.message : t('marketplace.inquiry.sendError')
  } finally {
    isSending.value = false
  }
}
</script>

<template>
  <section class="ui-card mt-4 p-4">
    <h2 class="ui-section-title">{{ $t('marketplace.inquiry.contactTitle') }}</h2>
    <p class="ui-caption mt-1">{{ $t('marketplace.inquiry.contactHint') }}</p>

    <div v-if="!authUiReady" class="mt-4 h-20 animate-pulse bg-(--ui-surface-muted)/40" aria-hidden="true" />

    <p v-else-if="isOwner" class="mt-4 text-sm text-(--ui-text-muted)">
      {{ $t('marketplace.inquiry.ownListing') }}
    </p>

    <p v-else-if="!auth.isAuthenticated" class="mt-4 text-sm text-(--ui-text-muted)">
      {{ $t('marketplace.inquiry.loginToContact') }}
      <NuxtLink :to="localePath('/login')" class="ui-link ml-1">
        {{ $t('auth.loginTitle') }}
      </NuxtLink>
    </p>

    <template v-else>
      <p v-if="sentInquiryId" class="ui-alert-success mt-4 text-sm" role="status">
        {{ $t('marketplace.inquiry.sent') }}
        <NuxtLink
          :to="localePath(`/app/marketplace-inquiries/${sentInquiryId}`)"
          class="ui-link ml-1"
        >
          {{ $t('marketplace.inquiry.viewConversation') }}
        </NuxtLink>
      </p>

      <form class="ui-form-stack mt-4" @submit.prevent="onSend">
        <label class="ui-field">
          {{ $t('marketplace.inquiry.messageLabel') }}
          <textarea
            v-model="messageBody"
            class="ui-textarea"
            rows="4"
            required
            minlength="1"
            maxlength="2000"
            :placeholder="$t('marketplace.inquiry.messagePlaceholder')"
          />
        </label>
        <p v-if="formError" class="ui-alert-error text-sm" role="alert">{{ formError }}</p>
        <button type="submit" class="ui-btn-primary ui-btn-sm" :disabled="!canSend">
          {{ isSending ? $t('common.saving') : $t('marketplace.inquiry.send') }}
        </button>
      </form>
    </template>
  </section>
</template>
