<script setup lang="ts">
interface Props {
  /** What this area will become */
  purpose: string
  /** Optional compact layout for sidebars / filter cards */
  compact?: boolean
  title?: string
}

withDefaults(defineProps<Props>(), {
  compact: false,
  title: '',
})
</script>

<template>
  <section
    class="ui-under-construction"
    :class="compact ? 'ui-under-construction--compact' : ''"
    role="status"
  >
    <p class="ui-under-construction-badge">
      {{ $t('underConstruction.badge') }}
    </p>
    <h2 v-if="title" class="ui-under-construction-title">
      {{ title }}
    </h2>
    <p class="ui-under-construction-purpose">
      {{ purpose }}
    </p>
    <p class="ui-under-construction-feedback">
      {{ $t('underConstruction.feedback') }}
    </p>
  </section>
</template>
