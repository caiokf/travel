import type { Trip } from '../types'

// Trip metadata for the journey list homepage
// Each trip links to its dedicated storytelling experience
export const trips: Trip[] = [
  {
    id: 'european-trail',
    title: 'The European Trail',
    subtitle: 'From Lisbon to Paris',
    description: 'An interactive storytelling journey through Western Europe.',
    thumbnail: '/img/trips/european-trail-thumb.jpg',
    heroImage: '/img/hero.jpg',
    route: '/trips/european-trail'
  }
]

export const getTripById = (id: string): Trip | undefined => {
  return trips.find(t => t.id === id)
}
