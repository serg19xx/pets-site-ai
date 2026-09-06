<script setup lang="ts">
const { t } = useI18n()
const { variant, src, toggleVariant } = useBrandLogo()
</script>

<template>
  <button
    type="button"
    class="ui-brand-mark-btn"
    :title="t('common.brandLogoSwitch')"
    :aria-label="t('common.brandLogoSwitch')"
    @click="toggleVariant"
  >
    <img
      :src="src"
      :alt="t('common.brand')"
      class="ui-brand-mark"
      :class="variant === 'circle' ? 'ui-brand-mark--circle' : 'ui-brand-mark--wide'"
      width="160"
      height="88"
      decoding="async"
      fetchpriority="high"
    />
  </button>
</template>
