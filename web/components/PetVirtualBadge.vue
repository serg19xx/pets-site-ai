<script setup lang="ts">
defineProps<{
  enabled?: boolean
}>()

const { t } = useI18n()

const gradientId = `virtual-grad-${useId().replace(/\W/g, '')}`
</script>

<template>
  <span
    v-if="enabled"
    class="ui-virtual-badge"
    :title="t('pet.virtualBadgeHint')"
    :aria-label="t('pet.virtualBadge')"
    role="img"
  >
    <svg
      class="ui-virtual-badge-icon"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          :id="gradientId"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stop-color="#4285F4" />
          <stop offset="35%" stop-color="#9B72CB" />
          <stop offset="65%" stop-color="#D96570" />
          <stop offset="100%" stop-color="#F2A60C" />
        </linearGradient>
      </defs>
      <path
        :fill="`url(#${gradientId})`"
        d="M12 1.5c.4 0 .72.26.84.64l1.9 6.15c.14.46.5.82.96.96l6.15 1.9c.38.12.64.44.64.84s-.26.72-.64.84l-6.15 1.9a1.5 1.5 0 0 0-.96.96l-1.9 6.15a.87.87 0 0 1-1.68 0l-1.9-6.15a1.5 1.5 0 0 0-.96-.96l-6.15-1.9A.87.87 0 0 1 1.5 12c0-.4.26-.72.64-.84l6.15-1.9a1.5 1.5 0 0 0 .96-.96l1.9-6.15A.87.87 0 0 1 12 1.5Z"
      />
      <path
        :fill="`url(#${gradientId})`"
        d="M19.5 2.2c.22 0 .4.14.46.35l.72 2.35c.1.34.37.6.71.71l2.35.72c.21.06.35.24.35.46s-.14.4-.35.46l-2.35.72a.95.95 0 0 0-.71.71l-.72 2.35a.48.48 0 0 1-.92 0l-.72-2.35a.95.95 0 0 0-.71-.71l-2.35-.72a.48.48 0 0 1 0-.92l2.35-.72a.95.95 0 0 0 .71-.71l.72-2.35c.06-.21.24-.35.46-.35Z"
      />
    </svg>
  </span>
</template>
