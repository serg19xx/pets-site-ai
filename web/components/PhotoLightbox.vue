<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

import { UI_ACTION_ICONS } from '~/lib/ui-icons'

export interface LightboxPhoto {
  id: number
  url: string
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    photos: LightboxPhoto[]
    initialIndex?: number
    title?: string
  }>(),
  {
    initialIndex: 0,
  },
)

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
}>()

const { t } = useI18n()

const currentIndex = ref(0)

const currentPhoto = computed(() => props.photos[currentIndex.value] ?? null)
const hasMultiple = computed(() => props.photos.length > 1)
const counterLabel = computed(() =>
  hasMultiple.value
    ? t('pet.lightboxCounter', {
        current: currentIndex.value + 1,
        total: props.photos.length,
      })
    : '',
)

function clampIndex(index: number): number {
  if (props.photos.length === 0) {
    return 0
  }
  return Math.max(0, Math.min(index, props.photos.length - 1))
}

function close() {
  emit('update:modelValue', false)
}

function goPrev() {
  if (!hasMultiple.value) {
    return
  }
  currentIndex.value =
    currentIndex.value <= 0 ? props.photos.length - 1 : currentIndex.value - 1
}

function goNext() {
  if (!hasMultiple.value) {
    return
  }
  currentIndex.value =
    currentIndex.value >= props.photos.length - 1 ? 0 : currentIndex.value + 1
}

function onBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    close()
  }
}

function onKeydown(event: KeyboardEvent) {
  if (!props.modelValue) {
    return
  }
  if (event.key === 'Escape') {
    close()
  } else if (event.key === 'ArrowLeft') {
    goPrev()
  } else if (event.key === 'ArrowRight') {
    goNext()
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      currentIndex.value = clampIndex(props.initialIndex)
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKeydown)
    } else {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeydown)
    }
  },
)

watch(
  () => props.initialIndex,
  (index) => {
    if (props.modelValue) {
      currentIndex.value = clampIndex(index)
    }
  },
)

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue && currentPhoto"
      class="ui-photo-lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      :aria-label="title ?? $t('pet.lightboxTitle')"
      @click="onBackdropClick"
    >
      <header class="ui-photo-lightbox-toolbar">
        <p v-if="title || counterLabel" class="ui-photo-lightbox-meta">
          <span v-if="title" class="font-medium">{{ title }}</span>
          <span v-if="counterLabel" class="opacity-80">{{ counterLabel }}</span>
        </p>
        <button
          type="button"
          class="ui-photo-lightbox-close"
          :aria-label="$t('pet.lightboxClose')"
          @click="close"
        >
          <Icon :icon="UI_ACTION_ICONS.remove" class="ui-icon-md" aria-hidden="true" />
        </button>
      </header>

      <div class="ui-photo-lightbox-stage">
        <button
          v-if="hasMultiple"
          type="button"
          class="ui-photo-lightbox-nav ui-photo-lightbox-nav--prev"
          :aria-label="$t('pet.lightboxPrev')"
          @click.stop="goPrev"
        >
          <Icon :icon="UI_ACTION_ICONS.chevronLeft" class="ui-icon-lg" aria-hidden="true" />
        </button>

        <img
          :src="currentPhoto.url"
          alt=""
          class="ui-photo-lightbox-img"
          decoding="async"
          @click.stop
        />

        <button
          v-if="hasMultiple"
          type="button"
          class="ui-photo-lightbox-nav ui-photo-lightbox-nav--next"
          :aria-label="$t('pet.lightboxNext')"
          @click.stop="goNext"
        >
          <Icon :icon="UI_ACTION_ICONS.chevronRight" class="ui-icon-lg" aria-hidden="true" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
