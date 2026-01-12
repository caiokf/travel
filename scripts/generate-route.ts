#!/usr/bin/env npx tsx

/**
 * Generate route.json for a journey
 *
 * Usage: npx tsx scripts/generate-route.ts <journey-slug>
 *
 * This script:
 * 1. Reads the journey.md file from public/journeys/<slug>/journey.md
 * 2. Extracts waypoints from the frontmatter
 * 3. Fetches road routes from OSRM API
 * 4. Saves the result to public/journeys/<slug>/route.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { parse as parseYaml } from 'yaml'

// OSRM API endpoint
const OSRM_API_BASE = 'https://router.project-osrm.org/route/v1'

// Route type to OSRM profile mapping
const ROUTE_PROFILES: Record<string, string> = {
  driving: 'driving',
  walking: 'foot',
  cycling: 'bike',
}

interface Waypoint {
  id: string
  name: string
  lat: number
  lon: number
}

interface Frontmatter {
  waypoints?: Waypoint[]
  'route-type'?: string
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): Frontmatter {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) {
    return {}
  }

  try {
    return parseYaml(match[1]) as Frontmatter
  } catch (e) {
    console.error('Failed to parse frontmatter:', e)
    return {}
  }
}

/**
 * Fetch route between two points using OSRM
 */
async function fetchRoute(
  from: [number, number], // [lng, lat]
  to: [number, number], // [lng, lat]
  profile: string
): Promise<[number, number][]> {
  const url = `${OSRM_API_BASE}/${profile}/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates
    }

    console.warn(`Route not found for segment, using straight line`)
    return [from, to]
  } catch (error) {
    console.error('Failed to fetch route:', error)
    return [from, to]
  }
}

/**
 * Simplify route to reduce file size
 */
function simplifyRoute(
  coordinates: [number, number][],
  tolerance: number = 0.0005
): [number, number][] {
  if (coordinates.length <= 2) return coordinates

  let maxDist = 0
  let maxIndex = 0

  const first = coordinates[0]
  const last = coordinates[coordinates.length - 1]

  for (let i = 1; i < coordinates.length - 1; i++) {
    const dist = perpendicularDistance(coordinates[i], first, last)
    if (dist > maxDist) {
      maxDist = dist
      maxIndex = i
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyRoute(coordinates.slice(0, maxIndex + 1), tolerance)
    const right = simplifyRoute(coordinates.slice(maxIndex), tolerance)
    return [...left.slice(0, -1), ...right]
  }

  return [first, last]
}

function perpendicularDistance(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const dx = lineEnd[0] - lineStart[0]
  const dy = lineEnd[1] - lineStart[1]

  const mag = Math.sqrt(dx * dx + dy * dy)
  if (mag === 0) return 0

  const u =
    ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) /
    (mag * mag)

  const closestX = lineStart[0] + u * dx
  const closestY = lineStart[1] + u * dy

  return Math.sqrt(
    Math.pow(point[0] - closestX, 2) + Math.pow(point[1] - closestY, 2)
  )
}

/**
 * Main function
 */
async function main() {
  const slug = process.argv[2]

  if (!slug) {
    console.error('Usage: npx tsx scripts/generate-route.ts <journey-slug>')
    console.error('Example: npx tsx scripts/generate-route.ts winter-hitchhiking-scandinavia')
    process.exit(1)
  }

  const journeyDir = join(process.cwd(), 'public', 'journeys', slug)
  const journeyFile = join(journeyDir, 'journey.md')

  if (!existsSync(journeyFile)) {
    console.error(`Journey file not found: ${journeyFile}`)
    process.exit(1)
  }

  console.log(`Reading journey: ${slug}`)
  const content = readFileSync(journeyFile, 'utf-8')
  const frontmatter = parseFrontmatter(content)

  const waypoints = frontmatter.waypoints || []
  if (waypoints.length < 2) {
    console.error('Journey must have at least 2 waypoints')
    process.exit(1)
  }

  const routeType = frontmatter['route-type'] || 'driving'
  const profile = ROUTE_PROFILES[routeType] || 'driving'

  console.log(`Route type: ${routeType} (profile: ${profile})`)
  console.log(`Waypoints: ${waypoints.length}`)

  const allCoordinates: [number, number][] = []

  // Fetch routes between consecutive waypoints
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i]
    const to = waypoints[i + 1]

    console.log(`  Fetching: ${from.name} → ${to.name}`)

    // Add delay to respect OSRM rate limits
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    const segmentCoords = await fetchRoute(
      [from.lon, from.lat],
      [to.lon, to.lat],
      profile
    )

    // Add coordinates (skip first point for subsequent segments)
    if (i === 0) {
      allCoordinates.push(...segmentCoords)
    } else {
      allCoordinates.push(...segmentCoords.slice(1))
    }
  }

  console.log(`Total coordinates before simplification: ${allCoordinates.length}`)

  // Simplify route to reduce file size
  const simplified = simplifyRoute(allCoordinates)
  console.log(`Total coordinates after simplification: ${simplified.length}`)

  // Save to route.json
  const outputFile = join(journeyDir, 'route.json')
  const output = {
    routeType,
    generatedAt: new Date().toISOString(),
    waypointCount: waypoints.length,
    coordinates: simplified,
  }

  writeFileSync(outputFile, JSON.stringify(output, null, 2))
  console.log(`Route saved to: ${outputFile}`)
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
