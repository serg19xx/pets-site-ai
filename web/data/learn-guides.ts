/** Wave-0 Learn guides — editorial HTML-ready blocks, one original language each. */

export const LEARN_SPECIES = ['dog', 'cat', 'small', 'general'] as const
export type LearnSpecies = (typeof LEARN_SPECIES)[number]

export const LEARN_TOPICS = ['care', 'health', 'nutrition', 'behavior', 'city'] as const
export type LearnTopic = (typeof LEARN_TOPICS)[number]

export interface LearnGuideParagraph {
  type: 'p'
  text: string
}

export interface LearnGuideList {
  type: 'ul'
  items: string[]
}

export type LearnGuideBlock = LearnGuideParagraph | LearnGuideList

export interface LearnGuide {
  slug: string
  species: LearnSpecies
  topic: LearnTopic
  originalLang: 'en' | 'fr'
  title: string
  summary: string
  authorName: string
  body: LearnGuideBlock[]
}

export const LEARN_GUIDES: LearnGuide[] = [
  {
    slug: 'winter-paws-quebec',
    species: 'general',
    topic: 'city',
    originalLang: 'en',
    title: 'Winter paws in Greater Montreal',
    summary: 'Salt, ice, and cold sidewalks — a short checklist for dogs and outdoor cats.',
    authorName: 'Pet Friends editorial',
    body: [
      {
        type: 'p',
        text: 'Quebec winters are hard on paws: road salt, ice, and long walks in the wind. This is general care, not a diagnosis — if a pad is split, bleeding, or your animal refuses to walk, see a veterinarian.',
      },
      {
        type: 'p',
        text: 'After a walk:',
      },
      {
        type: 'ul',
        items: [
          'Wipe paws and between the toes with a damp cloth. Salt and grit stay there.',
          'Check for cracks, ice balls in fur, or redness.',
          'If you use booties, try them at home first so they are not a battle on the street.',
          'A thin layer of pet-safe paw balm can help; avoid human lotions unless your vet agrees.',
        ],
      },
      {
        type: 'p',
        text: 'Keep walks shorter on very cold or very salty days. For cats that go out, a clear landing (no piled ice in front of the door) matters as much as the coat.',
      },
    ],
  },
  {
    slug: 'puppy-first-weeks',
    species: 'dog',
    topic: 'care',
    originalLang: 'en',
    title: 'A puppy’s first weeks at home',
    summary: 'Sleep, food, toilet, and people — keep it simple so the household can breathe.',
    authorName: 'Pet Friends editorial',
    body: [
      {
        type: 'p',
        text: 'The first weeks are about routine, not perfect training. You are teaching the puppy that this home is safe. If you have a breeder or rescue, keep their feeding notes for the first days so the stomach is not shocked.',
      },
      {
        type: 'ul',
        items: [
          'One quiet sleeping place. Puppies sleep a lot; overstimulation looks like “bad behaviour”.',
          'Toilet breaks after sleep, play, and meals. Reward outside, stay calm about accidents inside.',
          'Short, positive meetings with people and other dogs. Skip crowded parks until vaccines are discussed with your vet.',
          'Chews and rest beat long obedience sessions. Five minutes, often, is enough.',
        ],
      },
      {
        type: 'p',
        text: 'Book a veterinarian visit early — not only for shots, but so you know who to call if something is wrong. This guide does not replace that visit.',
      },
    ],
  },
  {
    slug: 'kitten-first-weeks',
    species: 'cat',
    topic: 'care',
    originalLang: 'en',
    title: 'A kitten’s first weeks at home',
    summary: 'One room first, then the rest of the apartment — litter, food, and hiding places.',
    authorName: 'Pet Friends editorial',
    body: [
      {
        type: 'p',
        text: 'A new apartment is loud and tall. Start with one room: litter, food, water, a hiding box, and a high shelf or cat tree. Let the kitten choose when to come out.',
      },
      {
        type: 'ul',
        items: [
          'Litter box away from food. Scoop daily. Many kittens already know the box; do not “rub the nose”.',
          'Keep the same food for several days if the previous home gave you a bag.',
          'Play in short bursts, then stop while it is still fun. Hands are not toys.',
          'Windows: screens and closed tilt-windows. Balconies need a plan before the kitten is curious.',
        ],
      },
      {
        type: 'p',
        text: 'If the kitten stops eating, hides constantly after several days, or has diarrhea that does not settle, call a veterinarian. Indoor life in Montreal still needs vaccines and parasite talk — ask your clinic.',
      },
    ],
  },
  {
    slug: 'when-to-call-a-vet',
    species: 'general',
    topic: 'health',
    originalLang: 'en',
    title: 'When to call a veterinarian',
    summary: 'A short list of “don’t wait”. This is not a diagnosis and not a substitute for a clinic.',
    authorName: 'Pet Friends editorial',
    body: [
      {
        type: 'p',
        text: 'Pet Friends is a community site, not a clinic. Use this list only as a prompt to pick up the phone. Emergency clinics in Greater Montreal exist for nights and weekends — save a number before you need it.',
      },
      {
        type: 'p',
        text: 'Call sooner rather than later if you see:',
      },
      {
        type: 'ul',
        items: [
          'Trouble breathing, collapsing, seizures, or a bloated hard belly (especially in large dogs).',
          'Repeated vomiting or diarrhea, or no urine, especially in cats.',
          'A wound that will not stop bleeding, a suspected broken bone, or an eye that is suddenly closed or cloudy.',
          'Known toxin (chocolate, xylitol, lilies for cats, antifreeze, human medication). Bring the package if you can.',
          'A fight or bite from an unknown animal — infection and rabies rules are a vet conversation, not a forum one.',
        ],
      },
      {
        type: 'p',
        text: 'If you are unsure, describe what you see to the clinic — they would rather triage a false alarm than miss an emergency. Medical files on Pet Friends stay private; sharing them is your choice and is not the same as a visit.',
      },
    ],
  },
]

export function getLearnGuideBySlug(slug: string): LearnGuide | undefined {
  return LEARN_GUIDES.find((guide) => guide.slug === slug)
}

export function learnGuidesForSpecies(species: LearnSpecies): LearnGuide[] {
  return LEARN_GUIDES.filter((guide) => guide.species === species)
}

export function learnSpeciesWithGuides(): LearnSpecies[] {
  return LEARN_SPECIES.filter((species) => learnGuidesForSpecies(species).length > 0)
}
