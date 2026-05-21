<script setup lang="ts">
const { locale, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const opposite = computed(() => {
  if (locale.value === 'fr') {
    return {
      code: 'en' as const,
      flag: '🇺🇸',
      label: 'EN',
      aria: t('lang.switchToEn'),
    }
  }
  return {
    code: 'fr' as const,
    flag: '🇫🇷',
    label: 'FR',
    aria: t('lang.switchToFr'),
  }
})

async function toggleLanguage() {
  await navigateTo(switchLocalePath(opposite.value.code))
}
</script>

<template>
  <button
    type="button"
    class="ui-lang-btn"
    :aria-label="opposite.aria"
    :title="opposite.aria"
    @click="toggleLanguage"
  >
    <span class="text-lg leading-none" aria-hidden="true">{{ opposite.flag }}</span>
    <span class="hidden md:inline">{{ opposite.label }}</span>
  </button>
</template>
