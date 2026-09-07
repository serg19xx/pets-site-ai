<script setup lang="ts">
/** Root URL — feed lives at /feed so the path matches the nav label. */
const localePath = useLocalePath()
await navigateTo(localePath('/feed'), { redirectCode: 301, replace: true })
</script>
