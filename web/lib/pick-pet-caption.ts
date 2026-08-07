/** Prefer caption in the active UI locale; fall back to the other language. */
export function pickPetCaption(
  item: { caption?: string | null; captionFr?: string | null },
  locale: string,
): string | null {
  const en = item.caption?.trim() || null
  const fr = item.captionFr?.trim() || null
  const preferFr = locale.toLowerCase().startsWith('fr')
  if (preferFr) {
    return fr || en
  }
  return en || fr
}

/** Cover caption on gallery cards (same bilingual pick). */
export function pickCoverCaption(
  pet: { coverCaption?: string | null; coverCaptionFr?: string | null },
  locale: string,
): string | null {
  return pickPetCaption(
    { caption: pet.coverCaption, captionFr: pet.coverCaptionFr },
    locale,
  )
}

/**
 * Latest AI event voice for gallery cards / pet hero.
 * Prefers latest draft; falls back to a photo cover caption.
 */
export function pickLatestVoice(
  pet: {
    latestVoice?: string | null
    latestVoiceFr?: string | null
    coverCaption?: string | null
    coverCaptionFr?: string | null
  },
  locale: string,
): string | null {
  return (
    pickPetCaption(
      { caption: pet.latestVoice, captionFr: pet.latestVoiceFr },
      locale,
    ) || pickCoverCaption(pet, locale)
  )
}

/**
 * Gallery card quote: latest event voice, else greeting so the card is never empty.
 */
export function pickGalleryCardVoice(
  pet: {
    latestVoice?: string | null
    latestVoiceFr?: string | null
    coverCaption?: string | null
    coverCaptionFr?: string | null
    greeting?: string | null
    greetingFr?: string | null
  },
  locale: string,
): string | null {
  const voice = pickLatestVoice(pet, locale)
  if (voice) {
    return voice
  }
  return pickPetCaption(
    { caption: pet.greeting, captionFr: pet.greetingFr },
    locale,
  )
}
