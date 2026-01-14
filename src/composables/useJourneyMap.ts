import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue'
import * as d3 from 'd3'
import type { FeatureCollection, Feature, Geometry } from 'geojson'
import type { WaypointWithProgress } from './useJourneyScrollProgress'
import { fetchJourneyRoutes, simplifyRoute } from '../services/routingService'
import { getWorldMap, getCachedRoute, cacheRoute } from '../services/mapCache'
import { loadJourneyRoute } from '../services/journeyService'

interface JourneyMapOptions {
  waypoints: Ref<WaypointWithProgress[]>
  countries: Ref<string[]>
  scrollProgress: Ref<number>
  canvasRef: Ref<HTMLCanvasElement | null>
  slug?: Ref<string>
  // Optional configuration from markdown frontmatter
  mapZoom?: Ref<number | undefined>
  mapCenter?: Ref<[number, number] | undefined>
  routeType?: Ref<'driving' | 'walking' | 'cycling' | 'straight' | undefined>
}

export interface WaypointScreenPosition {
  id: string
  x: number  // screen x position
  y: number  // screen y position
  isVisible: boolean
}

export function useJourneyMap(options: JourneyMapOptions) {
  const { waypoints, countries, scrollProgress, canvasRef, slug, mapZoom, mapCenter, routeType } = options

  const isLoaded = ref(false)
  const cameraPosition = ref({ x: 0, y: 0 })

  // Screen positions of waypoint markers (updated each render)
  const waypointScreenPositions = ref<WaypointScreenPosition[]>([])

  let geoData: FeatureCollection | null = null
  let projection: d3.GeoProjection | null = null
  let pathGenerator: d3.GeoPath | null = null
  let animationFrame: number | null = null

  // Projected coordinates
  let projectedWaypoints: { id: string; x: number; y: number }[] = []
  let projectedPath: [number, number][] = []

  // Pre-calculated cumulative distances for smooth interpolation
  let cumulativeDistances: number[] = []
  let totalPathLength: number = 0

  // Where each waypoint falls along the route (0-1, as percentage of route distance)
  let waypointRoutePositions: number[] = []

  // Helper to recalculate path distances
  const recalculateDistances = () => {
    cumulativeDistances = [0]
    for (let i = 1; i < projectedPath.length; i++) {
      const dx = projectedPath[i][0] - projectedPath[i - 1][0]
      const dy = projectedPath[i][1] - projectedPath[i - 1][1]
      const segmentLength = Math.sqrt(dx * dx + dy * dy)
      cumulativeDistances.push(cumulativeDistances[i - 1] + segmentLength)
    }
    totalPathLength = cumulativeDistances[cumulativeDistances.length - 1] || 1

    // Calculate where each waypoint falls along the route path
    waypointRoutePositions = projectedWaypoints.map((wp) => {
      // Find the closest point on the path to this waypoint
      let minDist = Infinity
      let closestIndex = 0

      for (let i = 0; i < projectedPath.length; i++) {
        const dx = projectedPath[i][0] - wp.x
        const dy = projectedPath[i][1] - wp.y
        const dist = dx * dx + dy * dy
        if (dist < minDist) {
          minDist = dist
          closestIndex = i
        }
      }

      // Return the position as a fraction of total path length
      return cumulativeDistances[closestIndex] / totalPathLength
    })
  }

  // Convert scroll progress (DOM-based) to route progress (path-distance-based)
  // This ensures that when scrollProgress = waypoint.pathPosition, the trail reaches that waypoint
  const scrollToRouteProgress = (scrollProg: number): number => {
    const wps = waypoints.value
    if (wps.length < 2 || waypointRoutePositions.length < 2) return scrollProg

    // Find which waypoint segment we're in based on scroll progress
    let prevWpIndex = 0
    for (let i = wps.length - 1; i >= 0; i--) {
      if (scrollProg >= wps[i].pathPosition) {
        prevWpIndex = i
        break
      }
    }

    const nextWpIndex = Math.min(prevWpIndex + 1, wps.length - 1)

    // Get the scroll positions (DOM-based) for prev and next waypoints
    const prevScrollPos = wps[prevWpIndex].pathPosition
    const nextScrollPos = wps[nextWpIndex].pathPosition

    // Get the route positions for prev and next waypoints
    const prevRoutePos = waypointRoutePositions[prevWpIndex] ?? 0
    const nextRoutePos = waypointRoutePositions[nextWpIndex] ?? 1

    // Interpolate within the segment
    const scrollSegmentLength = nextScrollPos - prevScrollPos
    if (scrollSegmentLength <= 0) return prevRoutePos

    const t = (scrollProg - prevScrollPos) / scrollSegmentLength
    return prevRoutePos + t * (nextRoutePos - prevRoutePos)
  }

  // Load world map data (uses cache from preload)
  const loadMap = async (): Promise<void> => {
    try {
      // Get world map from cache (preloaded on homepage)
      geoData = await getWorldMap()
      if (!geoData) {
        console.error('Failed to load world map')
        return
      }

      // Calculate bounds from waypoints
      const wps = waypoints.value
      if (wps.length === 0) return

      const lons = wps.map((wp) => wp.lon)
      const lats = wps.map((wp) => wp.lat)

      const minLon = Math.min(...lons)
      const maxLon = Math.max(...lons)
      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)

      // Use frontmatter center or calculate from waypoints
      const centerLon = mapCenter?.value?.[0] ?? (minLon + maxLon) / 2
      const centerLat = mapCenter?.value?.[1] ?? (minLat + maxLat) / 2

      // Calculate scale based on bounds, or use frontmatter override
      const lonSpan = maxLon - minLon
      const latSpan = maxLat - minLat
      const span = Math.max(lonSpan, latSpan, 1) // Minimum 1 degree
      const autoScale = 8000 / span
      const scale = mapZoom?.value ?? Math.min(autoScale, 20000)

      // Set up projection centered on journey
      projection = d3
        .geoMercator()
        .center([centerLon, centerLat])
        .scale(scale)
        .translate([800, 600])

      pathGenerator = d3.geoPath().projection(projection)

      // Calculate projected coordinates for waypoints
      projectedWaypoints = wps.map((wp) => {
        const projected = projection!([wp.lon, wp.lat])
        return {
          id: wp.id,
          x: projected ? projected[0] : 0,
          y: projected ? projected[1] : 0,
        }
      })

      // Start with straight lines for instant display
      projectedPath = projectedWaypoints.map(
        (wp) => [wp.x, wp.y] as [number, number]
      )
      recalculateDistances()
      isLoaded.value = true

      // Fetch actual routes in background (unless straight lines requested)
      const currentRouteType = routeType?.value ?? 'driving'

      if (currentRouteType !== 'straight') {
        const currentSlug = slug?.value

        // Try loading pre-generated route first
        if (currentSlug) {
          const preGeneratedRoute = await loadJourneyRoute(currentSlug)
          if (preGeneratedRoute) {
            console.log(`Using pre-generated route: ${preGeneratedRoute.length} points`)
            projectedPath = preGeneratedRoute.map((coord) => {
              const projected = projection!(coord)
              return projected
                ? ([projected[0], projected[1]] as [number, number])
                : ([0, 0] as [number, number])
            })
            recalculateDistances()
            return // Route loaded, no need to fetch from API
          }
        }

        // Fallback to runtime route fetching if no pre-generated route
        const waypointsWithCoords = wps.map((wp) => ({
          id: wp.id,
          coordinates: [wp.lon, wp.lat] as [number, number],
        }))

        // Check route cache first
        const cachedRoute = getCachedRoute(waypointsWithCoords, currentRouteType)
        if (cachedRoute) {
          console.log('Using cached route')
          projectedPath = cachedRoute.map((coord) => {
            const projected = projection!(coord)
            return projected
              ? ([projected[0], projected[1]] as [number, number])
              : ([0, 0] as [number, number])
          })
          recalculateDistances()
        } else {
          // Fetch routes in background
          fetchJourneyRoutes(waypointsWithCoords, currentRouteType)
            .then((routeCoordinates) => {
              // Cache the route
              cacheRoute(waypointsWithCoords, currentRouteType, routeCoordinates)

              // Simplify the route for performance
              const simplifiedRoute = simplifyRoute(routeCoordinates, 0.01)
              console.log(
                `Route loaded: ${routeCoordinates.length} → ${simplifiedRoute.length} points`
              )

              // Project all route coordinates to canvas coordinates
              projectedPath = simplifiedRoute.map((coord) => {
                const projected = projection!(coord)
                return projected
                  ? ([projected[0], projected[1]] as [number, number])
                  : ([0, 0] as [number, number])
              })
              recalculateDistances()
            })
            .catch((error) => {
              console.error('Failed to fetch routes:', error)
              // Keep using straight lines
            })
        }
      }
    } catch (error) {
      console.error('Failed to load map:', error)
    }
  }

  // Get point along the journey path at given progress (0-1)
  const getPointOnPath = (progress: number): { x: number; y: number } => {
    if (projectedPath.length < 2) return { x: 0, y: 0 }

    const targetDistance = progress * totalPathLength

    // Binary search to find the segment containing the target distance
    let low = 0
    let high = cumulativeDistances.length - 1
    while (low < high - 1) {
      const mid = Math.floor((low + high) / 2)
      if (cumulativeDistances[mid] <= targetDistance) {
        low = mid
      } else {
        high = mid
      }
    }

    const segmentIndex = low
    const segmentStart = cumulativeDistances[segmentIndex]
    const segmentEnd = cumulativeDistances[segmentIndex + 1] || segmentStart
    const segmentLength = segmentEnd - segmentStart

    const segmentT =
      segmentLength > 0 ? (targetDistance - segmentStart) / segmentLength : 0

    const p1 = projectedPath[segmentIndex]
    const p2 =
      projectedPath[Math.min(segmentIndex + 1, projectedPath.length - 1)]

    return {
      x: p1[0] + (p2[0] - p1[0]) * segmentT,
      y: p1[1] + (p2[1] - p1[1]) * segmentT,
    }
  }

  // Get the segment index for a given progress
  const getSegmentIndexAtProgress = (
    progress: number
  ): { index: number; t: number } => {
    const targetDistance = progress * totalPathLength

    let low = 0
    let high = cumulativeDistances.length - 1
    while (low < high - 1) {
      const mid = Math.floor((low + high) / 2)
      if (cumulativeDistances[mid] <= targetDistance) {
        low = mid
      } else {
        high = mid
      }
    }

    const segmentStart = cumulativeDistances[low]
    const segmentEnd = cumulativeDistances[low + 1] || segmentStart
    const segmentLength = segmentEnd - segmentStart
    const t =
      segmentLength > 0 ? (targetDistance - segmentStart) / segmentLength : 0

    return { index: low, t }
  }

  // Catmull-Rom spline interpolation for smooth camera movement
  const catmullRom = (
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    t: number
  ): { x: number; y: number } => {
    const t2 = t * t
    const t3 = t2 * t

    const x =
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3)

    const y =
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)

    return { x, y }
  }

  // Get smooth camera position using Catmull-Rom spline through waypoints
  // Uses scroll progress (DOM-based) to determine camera position between waypoints
  const getCameraPosition = (scrollProg: number): { x: number; y: number } => {
    if (projectedWaypoints.length < 2) return { x: 0, y: 0 }

    const wps = waypoints.value
    const points = projectedWaypoints

    // Find which waypoint segment we're in based on scroll progress
    let prevWpIndex = 0
    for (let i = wps.length - 1; i >= 0; i--) {
      if (scrollProg >= wps[i].pathPosition) {
        prevWpIndex = i
        break
      }
    }

    const nextWpIndex = Math.min(prevWpIndex + 1, wps.length - 1)

    // Calculate interpolation factor within this segment
    const prevScrollPos = wps[prevWpIndex]?.pathPosition ?? 0
    const nextScrollPos = wps[nextWpIndex]?.pathPosition ?? 1
    const scrollSegmentLength = nextScrollPos - prevScrollPos

    let t = 0
    if (scrollSegmentLength > 0) {
      t = (scrollProg - prevScrollPos) / scrollSegmentLength
    }

    // Apply smoothstep easing to t for smoother transitions
    const easedT = t * t * (3 - 2 * t)

    // Get the 4 control points for Catmull-Rom (with clamping at edges)
    const p0 = points[Math.max(0, prevWpIndex - 1)]
    const p1 = points[prevWpIndex]
    const p2 = points[nextWpIndex]
    const p3 = points[Math.min(points.length - 1, nextWpIndex + 1)]

    return catmullRom(p0, p1, p2, p3, easedT)
  }

  const render = () => {
    const canvas = canvasRef.value
    if (!canvas || !isLoaded.value || !geoData || !projection || !pathGenerator)
      return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scrollProg = scrollProgress.value
    const routeProg = scrollToRouteProgress(scrollProg)
    const journeyCountries = countries.value

    // Use smooth camera position (waypoint-based) for map panning
    const camPos = getCameraPosition(scrollProg)
    cameraPosition.value = camPos

    const viewportWidth = canvas.width
    const viewportHeight = canvas.height

    // Dynamic zoom and pan based on progress
    const baseZoom = 1.2
    const zoomProgress = Math.sin(scrollProg * Math.PI)
    const zoom = baseZoom + zoomProgress * 0.4

    // Calculate viewport offset - shift map to the right
    const mapOffsetX = viewportWidth * 0.35
    const offsetX = camPos.x * zoom - viewportWidth / 2 - mapOffsetX
    const offsetY = camPos.y * zoom - viewportHeight / 2

    // Clear canvas
    ctx.clearRect(0, 0, viewportWidth, viewportHeight)

    // Draw ocean background
    ctx.fillStyle = '#d4dde6'
    ctx.fillRect(0, 0, viewportWidth, viewportHeight)

    ctx.save()
    ctx.translate(-offsetX, -offsetY)
    ctx.scale(zoom, zoom)

    // Draw countries
    geoData.features.forEach((feature: Feature<Geometry>) => {
      const name = feature.properties?.name || ''

      // Create path for this country
      const path = new Path2D(pathGenerator!(feature) || '')

      if (journeyCountries.includes(name)) {
        // Highlighted journey countries
        ctx.fillStyle = '#FDFCEC'
        ctx.strokeStyle = '#a8b5ba'
        ctx.lineWidth = 1.5 / zoom
      } else {
        // Other countries
        ctx.fillStyle = '#e8edef'
        ctx.strokeStyle = '#c8d4d8'
        ctx.lineWidth = 0.5 / zoom
      }

      ctx.fill(path)
      ctx.stroke(path)
    })

    // Draw the journey trail (uses route progress for accurate path drawing)
    drawTrail(ctx, routeProg, zoom)

    // Draw waypoint markers (uses scroll progress to match DOM positions)
    drawWaypoints(ctx, scrollProg, zoom)

    // Draw current position marker (uses route progress)
    drawCurrentPosition(ctx, routeProg, zoom)

    ctx.restore()

    // Draw image connectors (cones from images to waypoints)
    drawImageConnectors(ctx, zoom, offsetX, offsetY)

    // Calculate and store screen positions of waypoints for external use
    updateWaypointScreenPositions(zoom, offsetX, offsetY, viewportWidth, viewportHeight)
  }

  // Draw cone connectors from images to their waypoints
  const drawImageConnectors = (
    ctx: CanvasRenderingContext2D,
    zoom: number,
    offsetX: number,
    offsetY: number
  ) => {
    // Find all images within waypoint sections
    const sections = document.querySelectorAll('[data-waypoint-id]')

    sections.forEach((section) => {
      const waypointId = section.getAttribute('data-waypoint-id')
      if (!waypointId) return

      // Find the waypoint's screen position
      const wpIndex = projectedWaypoints.findIndex(wp => wp.id === waypointId)
      if (wpIndex < 0) return

      const wp = projectedWaypoints[wpIndex]
      const waypointScreenX = wp.x * zoom - offsetX
      const waypointScreenY = wp.y * zoom - offsetY

      // Find all images in this section
      const images = section.querySelectorAll('.story-image img')

      images.forEach((img) => {
        const rect = img.getBoundingClientRect()

        // Calculate image visibility based on distance from viewport center
        const halfWindowHeight = window.innerHeight / 2
        const falloff = halfWindowHeight * 1.2
        const imageMiddle = rect.top + rect.height / 2
        let imageVisibility = (falloff - Math.abs(halfWindowHeight - imageMiddle)) / falloff

        // Apply easing (quadratic out)
        imageVisibility = Math.max(0, Math.min(1, imageVisibility))
        imageVisibility = imageVisibility * (2 - imageVisibility) // quad out easing

        if (imageVisibility <= 0) return

        // Origin point (waypoint on map)
        const origin = { x: waypointScreenX, y: waypointScreenY }

        // Determine which corners to use based on image position relative to waypoint
        // If image is above waypoint, use bottom corners; if below, use top corners
        // If image is to the left of waypoint, use right corners
        let corner1: [number, number]
        let corner2: [number, number]

        if (rect.top < origin.y) {
          // Image is above the waypoint
          corner1 = [rect.right, rect.bottom]
          corner2 = [rect.left, rect.bottom]
        } else {
          // Image is below or at the waypoint
          corner1 = [rect.right, rect.top]
          corner2 = [rect.left, rect.top]
        }

        // If waypoint is to the left of image, swap corners
        if (origin.x < rect.left) {
          corner1 = [rect.left, rect.top < origin.y ? rect.bottom : rect.top]
          corner2 = [rect.left, rect.top < origin.y ? rect.top : rect.bottom]
        } else if (origin.x > rect.right) {
          corner1 = [rect.right, rect.top < origin.y ? rect.bottom : rect.top]
          corner2 = [rect.right, rect.top < origin.y ? rect.top : rect.bottom]
        }

        // Draw the cone/triangle
        drawImageCone(ctx, origin, corner1, corner2, imageVisibility)
      })
    })
  }

  // Draw a cone/triangle from origin (waypoint) to image corners
  const drawImageCone = (
    ctx: CanvasRenderingContext2D,
    origin: { x: number; y: number },
    corner1: [number, number],
    corner2: [number, number],
    visibility: number
  ) => {
    const PI = Math.PI
    const PI2 = PI * 2

    // Calculate angles from origin to corners
    const getAngle = (x: number, y: number) => Math.atan2(y - origin.y, x - origin.x)
    const angle1 = getAngle(corner1[0], corner1[1]) + PI2
    const angle2 = getAngle(corner2[0], corner2[1]) + PI2

    // Calculate the angle difference and middle angle
    const angleDelta = Math.atan2(
      Math.sin(angle1 - angle2),
      Math.cos(angle1 - angle2)
    )
    const angleMiddle = angle1 - angleDelta / 2

    // Radius for the arc at the origin
    const radius = 2 * visibility

    // Calculate offset for the origin point (to create rounded end)
    const angleOrigin = angleMiddle + PI / 2
    const originOffset = {
      x: (radius + 1) * Math.cos(angleOrigin),
      y: (radius + 1) * Math.sin(angleOrigin),
    }

    // Draw the filled cone with semi-transparency
    ctx.save()

    // Use darken blend mode if supported, otherwise just use transparency
    const prevComposite = ctx.globalCompositeOperation
    ctx.globalCompositeOperation = 'darken'
    if (ctx.globalCompositeOperation !== 'darken') {
      ctx.globalCompositeOperation = 'source-over'
    }

    // Create gradient from waypoint (lighter) to image corners (darker)
    const cornerMidX = (corner1[0] + corner2[0]) / 2
    const cornerMidY = (corner1[1] + corner2[1]) / 2
    const gradient = ctx.createLinearGradient(origin.x, origin.y, cornerMidX, cornerMidY)

    const alphaAtOrigin = visibility * 0.3
    const alphaAtCorners = visibility * 0.9
    gradient.addColorStop(0, `rgba(180, 180, 160, ${alphaAtOrigin})`)
    gradient.addColorStop(1, `rgba(160, 160, 140, ${alphaAtCorners})`)

    ctx.fillStyle = gradient

    // Draw the cone shape
    ctx.beginPath()
    ctx.moveTo(origin.x + originOffset.x, origin.y + originOffset.y)
    ctx.lineTo(corner1[0], corner1[1])
    ctx.lineTo(corner2[0], corner2[1])
    ctx.lineTo(origin.x - originOffset.x, origin.y - originOffset.y)

    // Add arc at the origin for rounded appearance
    ctx.arc(origin.x, origin.y, radius, angleOrigin + PI, angleOrigin)
    ctx.fill()

    // Draw the small circle at the origin
    ctx.beginPath()
    ctx.arc(origin.x, origin.y, radius, angleOrigin, angleOrigin + PI2)
    ctx.fill()

    ctx.globalCompositeOperation = prevComposite

    // Draw a small filled circle at the waypoint point
    ctx.fillStyle = '#405b54'
    const imagePointRadius = 4 * visibility
    ctx.beginPath()
    ctx.arc(origin.x, origin.y, imagePointRadius, 0, PI2)
    ctx.fill()

    ctx.restore()
  }

  // Calculate the screen position of each waypoint marker
  const updateWaypointScreenPositions = (
    zoom: number,
    offsetX: number,
    offsetY: number,
    viewportWidth: number,
    viewportHeight: number
  ) => {
    const positions: WaypointScreenPosition[] = projectedWaypoints.map((wp) => {
      // Transform from projected coordinates to screen coordinates
      const screenX = wp.x * zoom - offsetX
      const screenY = wp.y * zoom - offsetY

      // Check if visible on screen
      const isVisible = screenX >= -50 && screenX <= viewportWidth + 50 &&
                        screenY >= -50 && screenY <= viewportHeight + 50

      return {
        id: wp.id,
        x: screenX,
        y: screenY,
        isVisible,
      }
    })

    waypointScreenPositions.value = positions
  }

  const drawTrail = (
    ctx: CanvasRenderingContext2D,
    progress: number,
    zoom: number
  ) => {
    if (projectedPath.length < 2 || progress <= 0) return

    // Get the segment index and interpolation for current progress
    const { index: endIndex, t: endT } = getSegmentIndexAtProgress(progress)

    // Calculate endpoint
    const p1 = projectedPath[endIndex]
    const p2 = projectedPath[Math.min(endIndex + 1, projectedPath.length - 1)]
    const endPoint: [number, number] = [
      p1[0] + (p2[0] - p1[0]) * endT,
      p1[1] + (p2[1] - p1[1]) * endT,
    ]

    // Draw trail shadow
    ctx.save()
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.lineWidth = 6 / zoom
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(projectedPath[0][0] + 2, projectedPath[0][1] + 2)
    for (let i = 1; i <= endIndex; i++) {
      ctx.lineTo(projectedPath[i][0] + 2, projectedPath[i][1] + 2)
    }
    ctx.lineTo(endPoint[0] + 2, endPoint[1] + 2)
    ctx.stroke()
    ctx.restore()

    // Draw main trail
    ctx.save()
    ctx.strokeStyle = '#c75050'
    ctx.lineWidth = 4 / zoom
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash([12 / zoom, 6 / zoom])

    ctx.beginPath()
    ctx.moveTo(projectedPath[0][0], projectedPath[0][1])
    for (let i = 1; i <= endIndex; i++) {
      ctx.lineTo(projectedPath[i][0], projectedPath[i][1])
    }
    ctx.lineTo(endPoint[0], endPoint[1])
    ctx.stroke()
    ctx.restore()
  }

  const drawWaypoints = (
    ctx: CanvasRenderingContext2D,
    scrollProg: number,
    zoom: number
  ) => {
    const wps = waypoints.value

    projectedWaypoints.forEach((wp, index) => {
      // Use the waypoint's pathPosition (DOM-based) to determine if active
      const waypointPathPos = wps[index]?.pathPosition ?? (index / (projectedWaypoints.length - 1 || 1))
      const isActive = scrollProg >= waypointPathPos
      const isUpcoming = scrollProg >= waypointPathPos - 0.05

      ctx.save()

      // Glow effect for active waypoints
      if (isActive) {
        ctx.shadowColor = '#d4a84b'
        ctx.shadowBlur = 15 / zoom
      }

      // Draw waypoint circle
      const radius = isUpcoming ? 10 / zoom : 6 / zoom

      ctx.beginPath()
      ctx.arc(wp.x, wp.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = isActive ? '#d4a84b' : '#8a9a9e'
      ctx.fill()

      ctx.strokeStyle = isActive ? '#b8923f' : '#6a787c'
      ctx.lineWidth = 2 / zoom
      ctx.stroke()

      ctx.restore()
    })
  }

  const drawCurrentPosition = (
    ctx: CanvasRenderingContext2D,
    progress: number,
    zoom: number
  ) => {
    if (progress <= 0) return

    const pos = getPointOnPath(progress)
    const pulseScale = 1 + Math.sin(Date.now() / 200) * 0.2

    ctx.save()

    // Outer glow
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, (14 * pulseScale) / zoom, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(199, 80, 80, 0.25)'
    ctx.fill()

    // Inner circle
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 6 / zoom, 0, Math.PI * 2)
    ctx.fillStyle = '#c75050'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2 / zoom
    ctx.stroke()

    ctx.restore()
  }

  const startAnimation = () => {
    const animate = () => {
      render()
      animationFrame = requestAnimationFrame(animate)
    }
    animate()
  }

  const stopAnimation = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }

  watch(scrollProgress, () => {
    if (!animationFrame) {
      render()
    }
  })

  // Re-initialize when waypoints change
  watch(
    waypoints,
    async () => {
      if (waypoints.value.length > 0) {
        stopAnimation()
        isLoaded.value = false
        await loadMap()
        startAnimation()
      }
    },
    { deep: true }
  )

  onMounted(async () => {
    if (waypoints.value.length > 0) {
      await loadMap()
      startAnimation()
    }
  })

  onUnmounted(() => {
    stopAnimation()
  })

  return {
    isLoaded,
    cameraPosition,
    waypointScreenPositions,
    render,
  }
}
