export interface Waypoint {
  id: string
  name: string
  x: number
  y: number
  pathPosition: number // 0-1 position along the path
}

export interface ContentBlock {
  type: 'paragraph' | 'image' | 'quote' | 'gallery'
  content?: string
  src?: string
  caption?: string
  author?: string
  images?: string[]
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
  coordinates?: [number, number][] // Array of [longitude, latitude] for globe arcs - key cities along the route
  status?: 'completed' | 'planned' // Trip status for future trips
}
