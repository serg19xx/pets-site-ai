export interface AnimalCard {
  id: string
  name: string
  species: string
  imageUrl: string
}

export const animalGallery: AnimalCard[] = [
  {
    id: '1',
    name: 'Luna',
    species: 'Cat',
    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop',
  },
  {
    id: '2',
    name: 'Buddy',
    species: 'Dog',
    imageUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=600&fit=crop',
  },
  {
    id: '3',
    name: 'Coco',
    species: 'Rabbit',
    imageUrl: 'https://images.unsplash.com/photo-1585110390001-0e29a0be1196?w=600&h=600&fit=crop',
  },
  {
    id: '4',
    name: 'Kiwi',
    species: 'Parrot',
    imageUrl: 'https://images.unsplash.com/photo-1552728086-b57ad9c88b7d?w=600&h=600&fit=crop',
  },
  {
    id: '5',
    name: 'Milo',
    species: 'Dog',
    imageUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87a?w=600&h=600&fit=crop',
  },
  {
    id: '6',
    name: 'Nala',
    species: 'Cat',
    imageUrl: 'https://images.unsplash.com/photo-1574159622686-ef9423f8c966?w=600&h=600&fit=crop',
  },
]
