import type { PetAiIdentity } from './pet-ai-context.js'

function speciesWordEn(slug: string, label: string): string {
  const map: Record<string, string> = {
    cat: 'cat',
    dog: 'dog',
    rabbit: 'bunny',
    bird: 'bird',
    hamster: 'hamster',
  }
  return map[slug] ?? label.toLowerCase()
}

function speciesWordFr(slug: string, label: string): string {
  const map: Record<string, string> = {
    cat: 'chat',
    dog: 'chien',
    rabbit: 'lapin',
    bird: 'oiseau',
    hamster: 'hamster',
  }
  return map[slug] ?? label.toLowerCase()
}

function articleEn(noun: string): string {
  return /^[aeiou]/i.test(noun) ? 'an' : 'a'
}

/** Local bilingual drafts when n8n is not wired yet. */
export function generateLocalSelfIntroduction(
  identity: PetAiIdentity,
): { body: string; bodyFr: string } {
  const enNoun = speciesWordEn(identity.speciesSlug, identity.speciesLabel)
  const frNoun = speciesWordFr(identity.speciesSlug, identity.speciesLabel)
  const breedBit = identity.breedLabel ? ` (${identity.breedLabel})` : ''
  const frFem = identity.sex === 'female' ? 'e' : ''

  return {
    body: `Hi friends! I'm ${identity.name}, ${articleEn(enNoun)} ${enNoun}${breedBit}. Excited to sniff around and meet you all!`,
    bodyFr: `Salut les amis ! Je suis ${identity.name}, un${frFem} ${frNoun}${breedBit}. Hâte de vous rencontrer et de jouer ensemble !`,
  }
}

export function generateLocalPhotoCaption(
  identity: PetAiIdentity,
): { body: string; bodyFr: string } {
  const enNoun = speciesWordEn(identity.speciesSlug, identity.speciesLabel)
  const frNoun = speciesWordFr(identity.speciesSlug, identity.speciesLabel)
  const frFem = identity.sex === 'female' ? 'e' : ''

  return {
    body: `Look what I just shared! Being ${articleEn(enNoun)} ${enNoun} means every angle is my good side — hope you like this one.`,
    bodyFr: `Regardez ce que je viens de partager ! Pour un${frFem} ${frNoun}, chaque angle est mon bon profil — j'espère que ça vous plaît.`,
  }
}

export function generateLocalVeterinaryVisit(
  identity: PetAiIdentity,
  procedureLabel: string,
): { body: string; bodyFr: string } {
  const procedure = procedureLabel.trim() || 'a check-up'
  const procedureFr = procedureLabel.trim() || 'un contrôle'

  return {
    body: `Today my human took me for ${procedure}. Not my favorite adventure — but I was brave, and I'm hoping for a treat soon.`,
    bodyFr: `Aujourd'hui mon humain m'a emmené pour ${procedureFr}. Pas mon aventure préférée — mais j'ai été courageux${identity.sex === 'female' ? 'se' : ''}, et j'espère une gâterie bientôt.`,
  }
}

export function generateLocalNewFriend(
  _identity: PetAiIdentity,
  friend: { name: string; speciesLabel: string },
): { body: string; bodyFr: string } {
  const friendName = friend.name.trim() || 'a new friend'
  const species = friend.speciesLabel.trim().toLowerCase() || 'friend'

  return {
    body: `I just met ${friendName}! What a lovely ${species} — I think we're going to be great friends.`,
    bodyFr: `Je viens de rencontrer ${friendName} ! Quel joli ${species} — je crois qu'on va bien s'entendre.`,
  }
}

export function generateLocalFriendHello(
  _identity: PetAiIdentity,
  friendName: string,
): { body: string; bodyFr: string } {
  const name = friendName.trim() || 'friend'
  return {
    body: `Hey ${name}! Want to play together sometime?`,
    bodyFr: `Salut ${name} ! On joue un peu ensemble un de ces jours ?`,
  }
}

export function generateLocalFriendReply(
  _identity: PetAiIdentity,
  friendName: string,
): { body: string; bodyFr: string } {
  const name = friendName.trim() || 'friend'
  return {
    body: `Hi ${name}! I'd love that — sniff you later!`,
    bodyFr: `Salut ${name} ! Avec plaisir — à tout à l'heure !`,
  }
}
