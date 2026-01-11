// Weather condition for waypoints
export interface WaypointWeather {
  condition: string
  temp: number
}

// Waypoint from markdown journey files
export interface JourneyWaypoint {
  id: string
  name: string
  lat: number
  lon: number
  country?: string
  date?: string
  weather?: WaypointWeather
}

// Legacy waypoint for existing map implementation
export interface Waypoint {
  id: string
  name: string
  x: number
  y: number
  pathPosition: number // 0-1 position along the path
}

export interface ContentBlock {
  type: 'paragraph' | 'image' | 'quote' | 'gallery' | 'heading' | 'divider'
  content?: string
  src?: string
  caption?: string
  author?: string
  images?: string[]
  level?: number // for headings (1-6)
}

export interface StorySection {
  id: string
  waypointId: string
  title?: string
  subtitle?: string
  intro?: string
  blocks: ContentBlock[]
}

export interface MapState {
  progress: number
  currentWaypoint: string | null
  cameraX: number
  cameraY: number
  zoom: number
}

// Journey from markdown files
export interface Journey {
  // Core identity
  id: string
  slug: string
  title: string
  subtitle: string
  description: string

  // Dates
  dateStart: string // ISO date
  dateEnd?: string // ISO date
  duration: string // e.g., "19 days"

  // Geography
  countries: string[]
  distance: string // e.g., "~1200 km"
  waypoints: JourneyWaypoint[]

  // Display
  thumbnail: string
  heroImage: string
  status: 'completed' | 'in-progress' | 'planned'

  // Optional
  tags?: string[]

  // Computed from waypoints for globe/timeline
  coordinates: [number, number][] // [lon, lat] array
  year: number
  month: number
  dateRange: string
}

// Story content parsed from markdown
export interface JourneyStory {
  journeyId: string
  sections: StorySection[]
  // Raw markdown for sections not yet parsed
  rawContent?: string
}

// Legacy Trip type for backward compatibility
export interface Trip {
  id: string
  title: string
  subtitle: string
  description: string
  thumbnail: string
  heroImage: string
  route: string
  // Timeline and globe visualization fields
  year?: number
  month?: number // 1-12
  dateRange?: string // e.g., "Mar 15 - Apr 2, 2023"
  countries?: string[] // e.g., ["Portugal", "Spain", "France"]
  cities?: number // number of cities visited
  distance?: string // e.g., "2,847 km"
  duration?: string // e.g., "18 days"
  coordinates?: [number, number][] // Array of [longitude, latitude] for globe arcs
  status?: 'completed' | 'planned' | 'in-progress'
}

// Convert Journey to Trip for backward compatibility
export function journeyToTrip(journey: Journey): Trip {
  return {
    id: journey.id,
    title: journey.title,
    subtitle: journey.subtitle,
    description: journey.description,
    thumbnail: journey.thumbnail,
    heroImage: journey.heroImage,
    route: `/journeys/${journey.slug}`,
    year: journey.year,
    month: journey.month,
    dateRange: journey.dateRange,
    countries: journey.countries,
    cities: journey.waypoints.length,
    distance: journey.distance,
    duration: journey.duration,
    coordinates: journey.coordinates,
    status: journey.status,
  }
}
