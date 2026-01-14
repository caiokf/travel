import { parse as parseYaml } from 'yaml'
import { marked } from 'marked'
import type {
  Journey,
  JourneyWaypoint,
  JourneyStory,
  StorySection,
  ContentBlock,
} from '../types'

// Cache for loaded journeys
const journeyCache = new Map<string, Journey>()
const storyCache = new Map<string, JourneyStory>()
let journeyListCache: Journey[] | null = null

// Dynamically discover all journey folders at build time using Vite's glob import
const journeyModules = import.meta.glob('/public/journeys/*/journey.md', {
  query: '?raw',
  import: 'default',
})

// Extract slugs from the discovered paths (excluding WIP folders)
const JOURNEY_SLUGS: string[] = Object.keys(journeyModules).map((path) => {
  const match = path.match(/\/public\/journeys\/([^/]+)\/journey\.md$/)
  return match ? match[1] : ''
}).filter((slug) => slug && !slug.startsWith('wip-'))

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>
  body: string
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) {
    return { frontmatter: {}, body: content }
  }

  const yamlStr = match[1]
  const body = match[2]

  try {
    const frontmatter = parseYaml(yamlStr) as Record<string, unknown>
    return { frontmatter, body }
  } catch (e) {
    console.error('Failed to parse frontmatter:', e)
    return { frontmatter: {}, body: content }
  }
}

/**
 * Format date range from ISO dates
 */
function formatDateRange(dateStart: string, dateEnd?: string): string {
  const start = new Date(dateStart)
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  // Handle invalid dates
  if (isNaN(start.getTime())) {
    return ''
  }

  const startStr = `${months[start.getMonth()]} ${start.getDate()}`

  if (!dateEnd) {
    return `${startStr}, ${start.getFullYear()}`
  }

  const end = new Date(dateEnd)
  if (isNaN(end.getTime())) {
    return `${startStr}, ${start.getFullYear()}`
  }

  const endStr = `${months[end.getMonth()]} ${end.getDate()}`

  if (start.getFullYear() === end.getFullYear()) {
    return `${startStr} - ${endStr}, ${start.getFullYear()}`
  }

  return `${startStr}, ${start.getFullYear()} - ${endStr}, ${end.getFullYear()}`
}

interface RawWaypoint {
  id?: string
  name?: string
  lat?: number
  lon?: number
  country?: string
  date?: string
  weather?: { condition: string; temp: number }
}

/**
 * Parse waypoints from frontmatter
 */
function parseWaypoints(waypointsData: unknown): JourneyWaypoint[] {
  if (!Array.isArray(waypointsData)) return []

  return (waypointsData as RawWaypoint[]).map((wp) => ({
    id: wp.id || '',
    name: wp.name || '',
    lat: wp.lat || 0,
    lon: wp.lon || 0,
    country: wp.country,
    date: wp.date,
    weather: wp.weather,
  }))
}

/**
 * Convert frontmatter to Journey object
 */
function frontmatterToJourney(
  frontmatter: Record<string, unknown>,
  slug: string
): Journey {
  const waypoints = parseWaypoints(frontmatter.waypoints as unknown[])
  const dateStart = String(frontmatter['date-start'] || '')
  const dateEnd = frontmatter['date-end']
    ? String(frontmatter['date-end'])
    : undefined
  const startDate = new Date(dateStart)

  // Extract coordinates from waypoints for globe visualization
  const coordinates: [number, number][] = waypoints.map((wp) => [wp.lon, wp.lat])

  // Parse countries - handle both array and string formats
  let countries: string[] = []
  if (Array.isArray(frontmatter.countries)) {
    countries = frontmatter.countries
  } else if (typeof frontmatter.countries === 'string') {
    // Handle YAML flow sequence format like [Norway, Sweden, Finland]
    countries = frontmatter.countries
      .replace(/[\[\]]/g, '')
      .split(',')
      .map((s: string) => s.trim())
  }

  // Parse status
  let status: 'completed' | 'in-progress' | 'planned' = 'completed'
  const rawStatus = String(frontmatter.status || 'completed')
  if (rawStatus === 'in-progress' || rawStatus === 'planned') {
    status = rawStatus
  }

  // Parse tags
  let tags: string[] | undefined
  if (Array.isArray(frontmatter.tags)) {
    tags = frontmatter.tags
  } else if (typeof frontmatter.tags === 'string') {
    tags = frontmatter.tags
      .replace(/[\[\]]/g, '')
      .split(',')
      .map((s: string) => s.trim())
  }

  // Parse map configuration
  const mapZoom = frontmatter['map-zoom']
    ? Number(frontmatter['map-zoom'])
    : undefined

  let mapCenter: [number, number] | undefined
  if (Array.isArray(frontmatter['map-center']) && frontmatter['map-center'].length === 2) {
    mapCenter = [Number(frontmatter['map-center'][0]), Number(frontmatter['map-center'][1])]
  }

  let routeType: 'driving' | 'walking' | 'cycling' | 'straight' | undefined
  const rawRouteType = String(frontmatter['route-type'] || '')
  if (['driving', 'walking', 'cycling', 'straight'].includes(rawRouteType)) {
    routeType = rawRouteType as 'driving' | 'walking' | 'cycling' | 'straight'
  }

  return {
    id: String(frontmatter.id || slug),
    slug,
    title: String(frontmatter.title || ''),
    subtitle: String(frontmatter.subtitle || ''),
    description: String(frontmatter.description || ''),
    dateStart,
    dateEnd,
    duration: String(frontmatter.duration || ''),
    countries,
    distance: String(frontmatter.distance || ''),
    waypoints,
    thumbnail: `/journeys/${slug}/thumbnail.png`,
    heroImage: `/journeys/${slug}/hero.png`,
    status,
    tags,
    mapZoom,
    mapCenter,
    routeType,
    coordinates,
    year: isNaN(startDate.getTime()) ? 2000 : startDate.getFullYear(),
    month: isNaN(startDate.getTime()) ? 1 : startDate.getMonth() + 1,
    dateRange: formatDateRange(dateStart, dateEnd),
  }
}

/**
 * Parse markdown body into story sections
 */
function parseStoryContent(
  body: string,
  waypoints: JourneyWaypoint[]
): StorySection[] {
  const sections: StorySection[] = []
  let currentWaypointId: string | null = null
  let currentBlocks: ContentBlock[] = []
  let currentTitle: string | undefined
  let currentSubtitle: string | undefined

  // Split by waypoint markers
  const waypointRegex = /<!--\s*waypoint:\s*(\w+)\s*-->/g
  const parts = body.split(waypointRegex)

  // parts will be: [content before first marker, waypointId1, content1, waypointId2, content2, ...]
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim()
    if (!part) continue

    // Check if this part is a waypoint ID
    const waypoint = waypoints.find((wp) => wp.id === part)
    if (waypoint) {
      // Save previous section if exists
      if (currentWaypointId && currentBlocks.length > 0) {
        sections.push({
          id: currentWaypointId,
          waypointId: currentWaypointId,
          title: currentTitle,
          subtitle: currentSubtitle,
          blocks: currentBlocks,
        })
      }

      // Start new section
      currentWaypointId = part
      currentBlocks = []
      currentTitle = undefined
      currentSubtitle = undefined
    } else if (currentWaypointId) {
      // Parse markdown content for this waypoint
      const blocks = parseMarkdownToBlocks(part)

      // Extract title and subtitle from first blocks if they're headings
      for (const block of blocks) {
        if (block.type === 'heading' && block.level === 1 && !currentTitle) {
          currentTitle = block.content
        } else if (
          block.type === 'heading' &&
          block.level === 2 &&
          !currentSubtitle
        ) {
          currentSubtitle = block.content
        } else {
          currentBlocks.push(block)
        }
      }
    }
  }

  // Don't forget the last section
  if (currentWaypointId && currentBlocks.length > 0) {
    sections.push({
      id: currentWaypointId,
      waypointId: currentWaypointId,
      title: currentTitle,
      subtitle: currentSubtitle,
      blocks: currentBlocks,
    })
  }

  return sections
}

/**
 * Parse markdown string into ContentBlocks
 */
function parseMarkdownToBlocks(markdown: string): ContentBlock[] {
  const blocks: ContentBlock[] = []
  const tokens = marked.lexer(markdown)

  for (const token of tokens) {
    switch (token.type) {
      case 'heading':
        blocks.push({
          type: 'heading',
          content: token.text,
          level: token.depth,
        })
        break

      case 'paragraph':
        // Check if it's an image
        if (token.text.startsWith('![')) {
          const imgMatch = token.text.match(/!\[(.*?)\]\((.*?)\)/)
          if (imgMatch) {
            blocks.push({
              type: 'image',
              caption: imgMatch[1],
              src: imgMatch[2],
            })
            break
          }
        }
        // Check if it's italic (used for story placeholders)
        if (token.text.startsWith('_') && token.text.endsWith('_')) {
          blocks.push({
            type: 'paragraph',
            content: token.text.slice(1, -1),
          })
        } else {
          blocks.push({
            type: 'paragraph',
            content: token.text,
          })
        }
        break

      case 'blockquote':
        blocks.push({
          type: 'quote',
          content: token.text,
        })
        break

      case 'hr':
        blocks.push({
          type: 'divider',
        })
        break

      case 'code':
        // Skip code blocks in story content
        break

      default:
        // Handle other token types as needed
        break
    }
  }

  return blocks
}

/**
 * Fetch and parse a journey markdown file
 */
export async function loadJourney(slug: string): Promise<Journey | null> {
  // Check cache
  if (journeyCache.has(slug)) {
    return journeyCache.get(slug)!
  }

  const modulePath = `/public/journeys/${slug}/journey.md`
  const loader = journeyModules[modulePath]

  if (!loader) {
    console.error(`Journey not found: ${slug}`)
    return null
  }

  try {
    // Load the raw markdown content via Vite's glob import
    const content = (await loader()) as string

    const { frontmatter, body } = parseFrontmatter(content)
    const journey = frontmatterToJourney(frontmatter, slug)

    // Cache it
    journeyCache.set(slug, journey)

    // Also parse and cache the story
    const story: JourneyStory = {
      journeyId: journey.id,
      sections: parseStoryContent(body, journey.waypoints),
      rawContent: body,
    }
    storyCache.set(slug, story)

    return journey
  } catch (e) {
    console.error(`Failed to load journey ${slug}:`, e)
    return null
  }
}

/**
 * Load journey story content
 */
export async function loadJourneyStory(
  slug: string
): Promise<JourneyStory | null> {
  // Check cache
  if (storyCache.has(slug)) {
    return storyCache.get(slug)!
  }

  // Load the journey first (which also caches the story)
  const journey = await loadJourney(slug)
  if (!journey) return null

  return storyCache.get(slug) || null
}

/**
 * Load all journeys (for homepage listing)
 */
export async function loadAllJourneys(): Promise<Journey[]> {
  // Check cache
  if (journeyListCache) {
    return journeyListCache
  }

  const journeys: Journey[] = []

  for (const slug of JOURNEY_SLUGS) {
    const journey = await loadJourney(slug)
    if (journey) {
      journeys.push(journey)
    }
  }

  // Sort by date (newest first)
  journeys.sort((a, b) => {
    return new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime()
  })

  journeyListCache = journeys
  return journeys
}

/**
 * Get all journey slugs
 */
export function getAllJourneySlugs(): string[] {
  return JOURNEY_SLUGS
}

/**
 * Load pre-generated route data for a journey
 */
export async function loadJourneyRoute(
  slug: string
): Promise<[number, number][] | null> {
  try {
    const response = await fetch(`/journeys/${slug}/route.json`)
    if (!response.ok) {
      return null
    }
    const data = await response.json()
    return data.coordinates || null
  } catch (e) {
    console.warn(`No pre-generated route for journey ${slug}:`, e)
    return null
  }
}

/**
 * Clear all caches (useful for development)
 */
export function clearJourneyCache(): void {
  journeyCache.clear()
  storyCache.clear()
  journeyListCache = null
}
