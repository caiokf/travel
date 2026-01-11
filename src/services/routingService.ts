// Routing service using OSRM (Open Source Routing Machine)
// Free routing API that doesn't require an API key

export interface RouteCoordinate {
  lat: number
  lng: number
}

export interface RouteSegment {
  from: string
  to: string
  coordinates: [number, number][] // [lng, lat] format for consistency with GeoJSON
}

// OSRM API endpoint base URL
const OSRM_API_BASE = 'https://router.project-osrm.org/route/v1'

// Route type to OSRM profile mapping
const ROUTE_PROFILES: Record<string, string> = {
  driving: 'driving',
  walking: 'foot',
  cycling: 'bike',
}

/**
 * Fetch route between two points using OSRM
 */
export async function fetchRoute(
  from: [number, number], // [lng, lat]
  to: [number, number], // [lng, lat]
  routeType: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<[number, number][]> {
  const profile = ROUTE_PROFILES[routeType] || 'driving'
  const url = `${OSRM_API_BASE}/${profile}/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      // Returns coordinates in [lng, lat] format
      return data.routes[0].geometry.coordinates
    }

    console.warn('OSRM route not found, falling back to straight line')
    return [from, to]
  } catch (error) {
    console.error('Failed to fetch driving route:', error)
    return [from, to]
  }
}

/**
 * Fetch all routes for a journey through multiple waypoints
 */
export async function fetchJourneyRoutes(
  waypoints: { id: string; coordinates: [number, number] }[],
  routeType: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<[number, number][]> {
  if (waypoints.length < 2) {
    return waypoints.map((wp) => wp.coordinates)
  }

  const allCoordinates: [number, number][] = []

  // Fetch routes between consecutive waypoints
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i]
    const to = waypoints[i + 1]

    console.log(`Fetching ${routeType} route: ${from.id} → ${to.id}`)

    const segmentCoords = await fetchRoute(
      from.coordinates,
      to.coordinates,
      routeType
    )

    // Add coordinates (skip first point for subsequent segments to avoid duplicates)
    if (i === 0) {
      allCoordinates.push(...segmentCoords)
    } else {
      allCoordinates.push(...segmentCoords.slice(1))
    }
  }

  return allCoordinates
}

/**
 * Simplify a route by reducing the number of points
 * Uses Ramer-Douglas-Peucker algorithm concept (simplified)
 */
export function simplifyRoute(
  coordinates: [number, number][],
  tolerance: number = 0.001
): [number, number][] {
  if (coordinates.length <= 2) return coordinates

  // Find point with maximum distance from line between first and last
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

  // If max distance is greater than tolerance, recursively simplify
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
