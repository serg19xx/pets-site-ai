export const PET_SEXES = ['male', 'female', 'unknown'] as const

export type PetSex = (typeof PET_SEXES)[number]

export function isPetSex(value: string): value is PetSex {
  return (PET_SEXES as readonly string[]).includes(value)
}
