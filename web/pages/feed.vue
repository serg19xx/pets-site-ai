<script setup lang="ts">
/** Legacy URL — feed is now the home page. */
const localePath = useLocalePath()
await navigateTo(localePath('/'), { redirectCode: 301, replace: true })
</script>
