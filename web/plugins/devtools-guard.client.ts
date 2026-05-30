export default defineNuxtPlugin(() => {
  const globalWithHook = window as typeof window & {
    __VUE_DEVTOOLS_GLOBAL_HOOK__?: {
      enabled?: boolean
      emit?: (...args: unknown[]) => void
      on?: (...args: unknown[]) => void
      once?: (...args: unknown[]) => void
      off?: (...args: unknown[]) => void
    }
  }

  const hook = globalWithHook.__VUE_DEVTOOLS_GLOBAL_HOOK__
  if (!hook) {
    return
  }

  hook.enabled = false
  hook.emit = () => {}
  hook.on = () => {}
  hook.once = () => {}
  hook.off = () => {}
})
