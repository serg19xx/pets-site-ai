<script setup lang="ts">
const { mainItems, utilityItems, isActive } = useAppNav()
</script>

<template>
  <nav class="w-56 shrink-0 p-4" aria-label="Main navigation">
    <ul class="ui-nav-list">
      <li v-for="item in mainItems" :key="item.id">
        <NuxtLink
          :to="item.path"
          class="ui-nav-item"
          :class="{ 'ui-nav-item-active': isActive(item) }"
        >
          <Icon :icon="item.icon" class="ui-icon-md" aria-hidden="true" />
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>

    <ul class="ui-nav-list ui-nav-utility">
      <li v-for="item in utilityItems" :key="item.id">
        <NuxtLink
          :to="item.path"
          class="ui-nav-item"
          :class="{ 'ui-nav-item-active': isActive(item) }"
        >
          <Icon :icon="item.icon" class="ui-icon-md" aria-hidden="true" />
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
