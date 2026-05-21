<script setup lang="ts">
import AppBrandMark from '~/components/layout/AppBrandMark.vue'
import HeaderAuth from '~/components/layout/HeaderAuth.vue'
import LanguageSwitcher from '~/components/layout/LanguageSwitcher.vue'

const localePath = useLocalePath()
</script>

<template>
  <header class="ui-header">
    <div class="ui-header-inner">
      <NuxtLink :to="localePath('/')" class="ui-brand-link">
        <AppBrandMark />
        <span class="ui-brand-wordmark hidden md:inline">
          <span class="ui-brand-wordmark-pet">{{ $t('common.brandPet') }}</span>
          <span class="ui-brand-wordmark-friends">{{ $t('common.brandFriends') }}</span>
        </span>
        <span class="sr-only">{{ $t('common.brand') }}</span>
      </NuxtLink>

      <div class="flex-1" />

      <LanguageSwitcher />
      <HeaderAuth />
    </div>
  </header>
</template>
