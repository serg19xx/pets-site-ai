<script setup lang="ts">
import type { MarketplaceListing } from '~/types/marketplace'

const props = defineProps<{
  listing: MarketplaceListing
  showAuthor?: boolean
}>()

const { locale, t } = useI18n()
const localePath = useLocalePath()

const coverImage = computed(() => props.listing.media[0] ?? null)

const createdLabel = computed(() =>
  new Date(props.listing.createdAt).toLocaleString(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }),
)

const priceLabel = computed(() => {
  if (props.listing.priceAmount === null) {
    return t('marketplace.priceOnRequest')
  }
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: props.listing.priceCurrency || 'CAD',
    maximumFractionDigits: 2,
  }).format(props.listing.priceAmount)
})

const typeLabel = computed(() =>
  t(`marketplace.types.${props.listing.type}` as 'marketplace.types.sell'),
)
</script>

<template>
  <article class="ui-card overflow-hidden">
    <div class="flex flex-col sm:flex-row">
      <div
        v-if="coverImage"
        class="aspect-16/10 w-full shrink-0 bg-(--ui-surface-muted) sm:aspect-auto sm:h-auto sm:w-36"
      >
        <img
          :src="coverImage.url"
          alt=""
          class="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div class="min-w-0 flex-1 p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="ui-caption uppercase">{{ typeLabel }}</p>
            <h3 class="mt-1 text-base font-semibold text-stone-900 dark:text-stone-100">
              {{ listing.title }}
            </h3>
          </div>
          <p class="text-sm font-semibold text-primary-700 dark:text-primary-300">
            {{ priceLabel }}
          </p>
        </div>

        <p class="mt-2 line-clamp-4 text-sm whitespace-pre-wrap text-stone-700 dark:text-stone-300">
          {{ listing.description }}
        </p>

        <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--ui-text-muted)">
          <span v-if="listing.city">{{ listing.city }}</span>
          <span>{{ createdLabel }}</span>
          <span v-if="showAuthor">{{ listing.author.displayName }}</span>
          <span v-if="listing.media.length > 1">
            {{ $t('marketplace.photosCount', { count: listing.media.length }) }}
          </span>
        </div>

        <div class="mt-3">
          <NuxtLink
            :to="localePath(`/marketplace/${listing.id}`)"
            class="ui-btn-secondary ui-btn-sm"
          >
            {{ $t('marketplace.viewDetails') }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </article>
</template>
