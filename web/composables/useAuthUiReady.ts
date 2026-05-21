/** True after client mount — keeps auth-dependent shell markup aligned with SSR. */
export function useAuthUiReady() {
  return useState('auth-ui-ready', () => false)
}
