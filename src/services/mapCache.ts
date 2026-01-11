// Map data cache service - preloads and caches map data for faster rendering

import * as topojson from 'topojson-client'
import type { FeatureCollection } from 'geojson'

// World Atlas TopoJSON URL (Natural Earth 110m)
const WORLD_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Cached data
let worldGeoData: FeatureCollection | null = null
let isLoading = false
let loadPromise: Promise<FeatureCollection | null> | null = null

/**
 * Preload world map data - call this on app init or homepage
 */
export async function preloadWorldMap(): Promise<FeatureCollection | null> {
  // Already cached
  if (worldGeoData) {
    return worldGeoData
  }

  // Already loading - return existing promise
  if (isLoading && loadPromise) {
    return loadPromise
  }

  isLoading = true
  loadPromise = (async () => {
    try {
      console.log('Preloading world map data...')
      const response = await fetch(WORLD_URL)
      const worldTopology = await response.json()

      // Convert TopoJSON to GeoJSON
      worldGeoData = topojson.feature(
        worldTopology,
        worldTopology.objects.countries
      ) as unknown as FeatureCollection

      console.log('World map data cached')
      return worldGeoData
    } catch (error) {
      console.error('Failed to preload world map:', error)
      return null
    } finally {
      isLoading = false
    }
  })()

  return loadPromise
}

/**
 * Get cached world map data (returns null if not yet loaded)
 */
export function getCachedWorldMap(): FeatureCollection | null {
  return worldGeoData
}

/**
 * Get world map data - loads if not cached
 */
export async function getWorldMap(): Promise<FeatureCollection | null> {
  if (worldGeoData) {
    return worldGeoData
  }
  return preloadWorldMap()
}

// Route cache
const routeCache = new Map<string, [number, number][]>()

/**
 * Get cache key for a route
 */
function getRouteCacheKey(
  waypoints: { id: string; coordinates: [number, number] }[],
  routeType: string
): string {
  const ids = waypoints.map(w => w.id).join('-')
  return `${routeType}:${ids}`
}

/**
 * Cache a route
 */
export function cacheRoute(
  waypoints: { id: string; coordinates: [number, number] }[],
  routeType: string,
  coordinates: [number, number][]
): void {
  const key = getRouteCacheKey(waypoints, routeType)
  routeCache.set(key, coordinates)
}

/**
 * Get cached route
 */
export function getCachedRoute(
  waypoints: { id: string; coordinates: [number, number] }[],
  routeType: string
): [number, number][] | null {
  const key = getRouteCacheKey(waypoints, routeType)
  return routeCache.get(key) || null
}
