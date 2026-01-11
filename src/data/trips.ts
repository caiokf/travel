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
    route: '/trips/european-trail',
    year: 2023,
    month: 9,
    dateRange: 'Sep 5 - Sep 22, 2023',
    countries: ['Portugal', 'Spain', 'France'],
    cities: 7,
    distance: '2,847 km',
    duration: '18 days',
    coordinates: [
      [-9.1393, 38.7223], // Lisbon
      [-5.9845, 37.3891], // Sevilla
      [-3.5986, 37.1773], // Granada
      [2.1734, 41.3851], // Barcelona
      [3.8767, 43.6108], // Montpellier
      [4.8357, 45.764], // Lyon
      [2.3522, 48.8566], // Paris
    ],
    status: 'completed',
  },
  {
    id: 'iceland-ring-road',
    title: 'Iceland Ring Road',
    subtitle: 'Around the Land of Fire and Ice',
    description:
      'A complete circumnavigation of Iceland along the famous Route 1.',
    thumbnail: '/img/trips/iceland-ring-road-thumb.jpg',
    heroImage: '/img/trips/iceland-ring-road-hero.jpg',
    route: '/trips/iceland-ring-road',
    year: 2024,
    month: 8,
    dateRange: 'Aug 10 - Aug 24, 2024',
    countries: ['Iceland'],
    cities: 12,
    distance: '1,332 km',
    duration: '14 days',
    coordinates: [
      [-21.9426, 64.1466], // Reykjavik
      [-23.0981, 64.0539], // Borgarnes
      [-18.9103, 65.6839], // Akureyri
      [-14.4039, 65.2644], // Egilsstadir
      [-15.212, 64.2539], // Hofn
      [-19.0208, 63.8625], // Vik
      [-21.9426, 64.1466], // Back to Reykjavik
    ],
    status: 'completed',
  },
  {
    id: 'japan-tokyo-kyoto',
    title: 'Japan: Tokyo to Kyoto',
    subtitle: 'Coming Soon',
    description:
      'An upcoming journey through Japan, from the neon lights of Tokyo to the ancient temples of Kyoto.',
    thumbnail: '/img/trips/japan-thumb.jpg',
    heroImage: '/img/trips/japan-hero.jpg',
    route: '/trips/japan-tokyo-kyoto',
    year: 2025,
    month: 4,
    countries: ['Japan'],
    coordinates: [
      [139.6917, 35.6895], // Tokyo
      [137.9025, 34.9756], // Nagoya
      [135.7681, 35.0116], // Kyoto
    ],
    status: 'planned',
  },
]

export const getTripById = (id: string): Trip | undefined => {
  return trips.find((t) => t.id === id)
}
