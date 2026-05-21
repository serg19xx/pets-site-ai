<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { CircleStencil, Cropper, type CropperResult } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

import { exportCanvasToFile } from '~/lib/image-export'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    file: File | null
    title?: string
    aspectRatio?: number
    freeAspect?: boolean
    maxOutputSize?: number
    outputFileName?: string
    circularPreview?: boolean
  }>(),
  {
    title: 'Edit photo',
    aspectRatio: 1,
    maxOutputSize: 512,
    outputFileName: 'photo.jpg',
    circularPreview: false,
    freeAspect: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  confirm: [file: File]
}>()

const cropperRef = ref<InstanceType<typeof Cropper> | null>(null)
const imageSrc = ref<string | null>(null)
const isProcessing = ref(false)
const localError = ref('')

const stencilProps = computed(() => {
  if (props.freeAspect) {
    return {}
  }
  return { aspectRatio: props.aspectRatio }
})

const stencilComponent = computed(() => {
  return props.circularPreview && props.aspectRatio === 1 ? CircleStencil : undefined
})

function revokeImageSrc() {
  if (imageSrc.value) {
    URL.revokeObjectURL(imageSrc.value)
    imageSrc.value = null
  }
}

watch(
  () => [props.modelValue, props.file] as const,
  ([open, file]) => {
    revokeImageSrc()
    localError.value = ''
    if (open && file) {
      imageSrc.value = URL.createObjectURL(file)
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  revokeImageSrc()
  window.removeEventListener('keydown', onEscapeKey)
})

function onEscapeKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.modelValue) {
    close()
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      window.addEventListener('keydown', onEscapeKey)
    } else {
      window.removeEventListener('keydown', onEscapeKey)
    }
  },
)

function close() {
  emit('update:modelValue', false)
}

function onBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    close()
  }
}

function rotateLeft() {
  cropperRef.value?.rotate(-90)
}

function rotateRight() {
  cropperRef.value?.rotate(90)
}

function zoomIn() {
  cropperRef.value?.zoom(1.15)
}

function zoomOut() {
  cropperRef.value?.zoom(0.87)
}

function resetCrop() {
  cropperRef.value?.reset()
}

async function applyCrop() {
  localError.value = ''
  const result = cropperRef.value?.getResult() as CropperResult | undefined
  const canvas = result?.canvas
  if (!canvas) {
    localError.value = 'Could not crop image.'
    return
  }

  isProcessing.value = true
  try {
    const file = await exportCanvasToFile(canvas, {
      fileName: props.outputFileName,
      maxSize: props.maxOutputSize,
      mimeType: 'image/jpeg',
    })
    emit('confirm', file)
    close()
  } catch {
    localError.value = 'Could not process image.'
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue && imageSrc"
      class="ui-modal-backdrop"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      @click="onBackdropClick"
    >
      <div class="ui-modal" @click.stop>
        <header class="ui-modal-header">
          <h2 class="ui-modal-title">{{ title }}</h2>
          <p class="ui-caption mt-0.5">
            Drag to reposition · pinch or scroll to zoom
          </p>
        </header>

        <div class="ui-modal-crop-area">
          <Cropper
            ref="cropperRef"
            :src="imageSrc"
            :stencil-props="stencilProps"
            :stencil-component="stencilComponent"
            class="h-full"
            image-restriction="stencil"
          />
        </div>

        <div class="ui-modal-toolbar">
          <button
            type="button"
            class="ui-icon-btn-sm"
            :disabled="isProcessing"
            :title="'Rotate left'"
            @click="rotateLeft"
          >
            <Icon :icon="UI_ACTION_ICONS.rotateLeft" class="ui-icon-sm" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="ui-icon-btn-sm"
            :disabled="isProcessing"
            title="Rotate right"
            @click="rotateRight"
          >
            <Icon :icon="UI_ACTION_ICONS.rotateRight" class="ui-icon-sm" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="ui-icon-btn-sm"
            :disabled="isProcessing"
            title="Zoom out"
            @click="zoomOut"
          >
            <Icon :icon="UI_ACTION_ICONS.zoomOut" class="ui-icon-sm" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="ui-icon-btn-sm"
            :disabled="isProcessing"
            title="Zoom in"
            @click="zoomIn"
          >
            <Icon :icon="UI_ACTION_ICONS.zoomIn" class="ui-icon-sm" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="ui-icon-btn-sm"
            :disabled="isProcessing"
            title="Reset"
            @click="resetCrop"
          >
            <Icon :icon="UI_ACTION_ICONS.reset" class="ui-icon-sm" aria-hidden="true" />
          </button>
        </div>

        <p v-if="localError" class="ui-text-error px-4 pt-2">
          {{ localError }}
        </p>

        <footer class="ui-modal-footer">
          <button
            type="button"
            class="ui-btn-secondary ui-btn-md flex-1"
            :disabled="isProcessing"
            @click="close"
          >
            Cancel
          </button>
          <button
            type="button"
            class="ui-btn-primary ui-btn-md flex-1"
            :disabled="isProcessing"
            @click="applyCrop"
          >
            {{ isProcessing ? 'Processing…' : 'Apply' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
:deep(.vue-advanced-cropper) {
  height: 100%;
}
</style>
