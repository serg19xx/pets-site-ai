/** Prefer greeting in the active UI locale; fall back to the other language. */
export function pickPetGreeting(
  pet: { greeting?: string | null; greetingFr?: string | null },
  locale: string,
): string | null {
  const en = pet.greeting?.trim() || null
  const fr = pet.greetingFr?.trim() || null
  const preferFr = locale.toLowerCase().startsWith('fr')
  if (preferFr) {
    return fr || en
  }
  return en || fr
}
