import { PET_SEXES, type PetSex } from '~/types/pet'
import { USER_GENDERS, type UserGender } from '~/types/user'

/** Localized labels for enum fields (UI only; API values stay English). */
export function useEnumLabels() {
  const { t } = useI18n()

  function genderLabel(value: UserGender): string {
    return t(`gender.${value}`)
  }

  function petSexLabel(value: PetSex): string {
    return t(`petSex.${value}`)
  }

  return {
    USER_GENDERS,
    PET_SEXES,
    genderLabel,
    petSexLabel,
  }
}
