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
}
