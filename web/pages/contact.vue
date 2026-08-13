<script setup lang="ts">
import { ApiError } from '~/lib/auth-api'
import { sendContactMessage } from '~/lib/contact-api'
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()
const authUiReady = useAuthUiReady()

usePageSeo({
  title: computed(() => t('meta.contact.title')),
  description: computed(() => t('meta.contact.description')),
  path: computed(() => localePath('/contact')),
})

const name = ref('')
const email = ref('')
const message = ref('')
const company = ref('')
const isSubmitting = ref(false)
const formError = ref('')
const formSuccess = ref('')

watch(
  [authUiReady, () => auth.user],
  () => {
    if (!authUiReady.value || !auth.user) {
      return
    }
    if (!name.value) {
      name.value = auth.displayName
    }
    if (!email.value) {
      email.value = auth.user.email
    }
  },
  { immediate: true },
)

async function handleSubmit() {
  formError.value = ''
  formSuccess.value = ''
  isSubmitting.value = true
  try {
    await sendContactMessage({
      name: name.value.trim(),
      email: email.value.trim(),
      message: message.value.trim(),
      company: company.value,
    })
    formSuccess.value = t('contact.success')
    message.value = ''
    company.value = ''
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      formError.value = t('contact.tooMany')
    } else if (error instanceof ApiError) {
      formError.value = error.message
    } else {
      formError.value = t('common.serverError')
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-md">
    <h1 class="ui-page-title">{{ $t('contact.title') }}</h1>
    <p class="ui-page-subtitle mt-1">
      {{ $t('contact.lead') }}
    </p>
    <p class="ui-page-subtitle mt-3">
      <i18n-t keypath="contact.faqHint" tag="span">
        <template #faq>
          <NuxtLink :to="localePath('/faq')" class="ui-link">
            {{ $t('nav.faq') }}
          </NuxtLink>
        </template>
      </i18n-t>
    </p>

    <p
      v-if="formSuccess"
      class="ui-alert-success mt-6"
      role="status"
    >
      {{ formSuccess }}
    </p>

    <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
      <div class="sr-only" aria-hidden="true">
        <label for="contact-company">Company</label>
        <input
          id="contact-company"
          v-model="company"
          type="text"
          tabindex="-1"
          autocomplete="off"
        />
      </div>

      <div>
        <label for="contact-name" class="ui-label-spaced">{{ $t('contact.name') }}</label>
        <input
          id="contact-name"
          v-model="name"
          type="text"
          required
          maxlength="120"
          autocomplete="name"
          class="ui-input"
        />
      </div>

      <div>
        <label for="contact-email" class="ui-label-spaced">{{ $t('contact.email') }}</label>
        <input
          id="contact-email"
          v-model="email"
          type="email"
          required
          maxlength="320"
          autocomplete="email"
          class="ui-input"
        />
      </div>

      <div>
        <label for="contact-message" class="ui-label-spaced">{{ $t('contact.message') }}</label>
        <textarea
          id="contact-message"
          v-model="message"
          required
          minlength="8"
          maxlength="4000"
          rows="6"
          class="ui-textarea"
        />
      </div>

      <p
        v-if="formError"
        class="ui-alert-error"
        role="alert"
      >
        {{ formError }}
      </p>

      <button
        type="submit"
        class="ui-btn-primary ui-btn-lg ui-btn-block"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? $t('contact.sending') : $t('contact.send') }}
      </button>
    </form>
  </section>
</template>
