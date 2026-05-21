<script setup lang="ts">
const { t } = useI18n()
const { variant, src, toggleVariant } = useBrandLogo()

function onLogoClick(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  toggleVariant()
}
</script>

<template>
  <img
    :src="src"
    alt=""
    role="button"
    tabindex="0"
    class="ui-brand-mark"
    :class="variant === 'circle' ? 'ui-brand-mark--circle' : 'ui-brand-mark--wide'"
    :title="t('common.brandLogoSwitch')"
    width="160"
    height="88"
    decoding="async"
    fetchpriority="high"
    @click="onLogoClick"
    @keydown.enter.prevent="toggleVariant"
    @keydown.space.prevent="toggleVariant"
  />
</template>
