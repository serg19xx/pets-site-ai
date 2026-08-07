/** Gallery photo (API: pet_photos). */
export interface PetPhoto {
  id: number
  url: string
  sortOrder: number
  createdAt: string
  isCover: boolean
  caption: string | null
  captionFr: string | null
}
