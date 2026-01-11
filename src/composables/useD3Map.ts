import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue'
import * as d3 from 'd3'
import type { FeatureCollection, Feature, Geometry } from 'geojson'
import type { Waypoint } from '../types'
import { fetchJourneyRoutes, simplifyRoute } from '../services/routingService'

interface D3MapOptions {
  geoJsonUrl: string
  waypoints: Waypoint[]
  scrollProgress: Ref<number>
  canvasRef: Ref<HTMLCanvasElement | null>
}

// Real geographic coordinates for our journey
const cityCoordinates: Record<string, [number, number]> = {
  lisbon: [-9.1393, 38.7223],
  sevilla: [-5.9845, 37.3891],
  granada: [-3.5986, 37.1773],
  barcelona: [2.1734, 41.3851],
  montpellier: [3.8767, 43.6108],
  lyon: [4.8357, 45.764],
  paris: [2.3522, 48.8566],
}

// Countries to highlight (our journey passes through)
const journeyCountries = ['Portugal', 'Spain', 'France']

// Countries to show for context
const contextCountries = [
  'United Kingdom',
  'Ireland',
  'Belgium',
  'Netherlands',
  'Luxembourg',
  'Germany',
  'Switzerland',
  'Italy',
  'Andorra',
  'Monaco',
]

export function useD3Map(options: D3MapOptions) {
  const { geoJsonUrl, waypoints, scrollProgress, canvasRef } = options

  const isLoaded = ref(false)
  const cameraPosition = ref({ x: 0, y: 0 })

  let geoData: FeatureCollection | null = null
  let projection: d3.GeoProjection | null = null
  let pathGenerator: d3.GeoPath | null = null
  let animationFrame: number | null = null

  // Journey path points in projected coordinates
  let projectedPath: [number, number][] = []
  let projectedWaypoints: { id: string; x: number; y: number }[] = []

  // Pre-calculated cumulative distances for smooth interpolation
  let cumulativeDistances: number[] = []
  let totalPathLength: number = 0

  // Load GeoJSON data
  const loadMap = async (): Promise<void> => {
    try {
      const response = await fetch(geoJsonUrl)
      geoData = await response.json()

      // Set up projection centered on Western Europe
      // Focus on the area from Portugal to France
      projection = d3
        .geoMercator()
        .center([-2, 43]) // Center between Spain and France
        .scale(1800)
        .translate([1000, 700])

      pathGenerator = d3.geoPath().projection(projection)

      // Calculate projected coordinates for waypoints
      projectedWaypoints = waypoints.map((wp) => {
        const coords = cityCoordinates[wp.id]
        if (coords && projection) {
          const projected = projection(coords)
          return {
            id: wp.id,
            x: projected ? projected[0] : 0,
            y: projected ? projected[1] : 0,
          }
        }
        return { id: wp.id, x: 0, y: 0 }
      })

      // Fetch actual driving routes between cities
      try {
        const waypointsWithCoords = waypoints.map((wp) => ({
          id: wp.id,
          coordinates: cityCoordinates[wp.id] as [number, number],
        }))

        console.log('Fetching driving routes...')
        const routeCoordinates = await fetchJourneyRoutes(waypointsWithCoords)

        // Aggressively simplify the route for performance (tolerance 0.05 = ~100-200 points)
        const simplifiedRoute = simplifyRoute(routeCoordinates, 0.05)
        console.log(
          `Route simplified: ${routeCoordinates.length} → ${simplifiedRoute.length} points`
        )

        // Project all route coordinates to canvas coordinates
        projectedPath = simplifiedRoute.map((coord) => {
          const projected = projection!(coord)
          return projected
            ? ([projected[0], projected[1]] as [number, number])
            : ([0, 0] as [number, number])
        })
      } catch (error) {
        console.error(
          'Failed to fetch driving routes, using straight lines:',
          error
        )
        // Fallback to straight lines between waypoints
        projectedPath = projectedWaypoints.map(
          (wp) => [wp.x, wp.y] as [number, number]
        )
      }

      // Pre-calculate cumulative distances for smooth interpolation
      cumulativeDistances = [0]
      for (let i = 1; i < projectedPath.length; i++) {
        const dx = projectedPath[i][0] - projectedPath[i - 1][0]
        const dy = projectedPath[i][1] - projectedPath[i - 1][1]
        const segmentLength = Math.sqrt(dx * dx + dy * dy)
        cumulativeDistances.push(cumulativeDistances[i - 1] + segmentLength)
      }
      totalPathLength = cumulativeDistances[cumulativeDistances.length - 1] || 1

      isLoaded.value = true
    } catch (error) {
      console.error('Failed to load map:', error)
    }
  }

  // Get point along the journey path at given progress (0-1) using distance-based interpolation
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

  // Get the segment index for a given progress (for efficient trail drawing)
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

  // Catmull-Rom spline interpolation for ultra-smooth camera movement
  const catmullRom = (
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    t: number
  ): { x: number; y: number } => {
    const t2 = t * t
    const t3 = t2 * t

    // Catmull-Rom basis functions
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
  const getCameraPosition = (progress: number): { x: number; y: number } => {
    if (projectedWaypoints.length < 2) return { x: 0, y: 0 }

    const points = projectedWaypoints
    const totalSegments = points.length - 1
    const segmentProgress = progress * totalSegments
    const segmentIndex = Math.min(
      Math.floor(segmentProgress),
      totalSegments - 1
    )
    const t = segmentProgress - segmentIndex

    // Apply smoothstep easing to t for even smoother transitions
    const easedT = t * t * (3 - 2 * t)

    // Get the 4 control points for Catmull-Rom (with clamping at edges)
    const p0 = points[Math.max(0, segmentIndex - 1)]
    const p1 = points[segmentIndex]
    const p2 = points[Math.min(points.length - 1, segmentIndex + 1)]
    const p3 = points[Math.min(points.length - 1, segmentIndex + 2)]

    return catmullRom(p0, p1, p2, p3, easedT)
  }

  const render = () => {
    const canvas = canvasRef.value
    if (!canvas || !isLoaded.value || !geoData || !projection || !pathGenerator)
      return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const progress = scrollProgress.value

    // Use smooth camera position (waypoint-based) for map panning
    const camPos = getCameraPosition(progress)
    cameraPosition.value = camPos

    const viewportWidth = canvas.width
    const viewportHeight = canvas.height

    // Dynamic zoom and pan based on progress (with eased zoom)
    const baseZoom = 1.2
    const zoomProgress = Math.sin(progress * Math.PI)
    const zoom = baseZoom + zoomProgress * 0.4

    // Calculate viewport offset - shift map to the right (show more on right side of screen)
    const mapOffsetX = viewportWidth * 0.35 // Push map 35% to the right
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
      const name = feature.properties?.NAME || ''

      // Create path for this country
      const path = new Path2D(pathGenerator!(feature) || '')

      if (journeyCountries.includes(name)) {
        // Highlighted journey countries
        ctx.fillStyle = '#FDFCEC'
        ctx.strokeStyle = '#a8b5ba'
        ctx.lineWidth = 1.5 / zoom
      } else if (contextCountries.includes(name)) {
        // Context countries
        ctx.fillStyle = '#e8edef'
        ctx.strokeStyle = '#c8d4d8'
        ctx.lineWidth = 1 / zoom
      } else {
        // Other countries (dimmed)
        ctx.fillStyle = '#d8e0e4'
        ctx.strokeStyle = '#c8d4d8'
        ctx.lineWidth = 0.5 / zoom
      }

      ctx.fill(path)
      ctx.stroke(path)
    })

    // Draw the journey trail
    drawTrail(ctx, progress, zoom)

    // Draw waypoint markers
    drawWaypoints(ctx, progress, zoom)

    // Draw current position marker
    drawCurrentPosition(ctx, progress, zoom)

    ctx.restore()
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

    // Draw trail shadow (simplified - just the main line offset)
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
    progress: number,
    zoom: number
  ) => {
    projectedWaypoints.forEach((wp, index) => {
      const waypointProgress = index / (projectedWaypoints.length - 1)
      const isActive = progress >= waypointProgress
      const isUpcoming = progress >= waypointProgress - 0.05

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

  onMounted(async () => {
    await loadMap()
    startAnimation()
  })

  onUnmounted(() => {
    stopAnimation()
  })

  return {
    isLoaded,
    cameraPosition,
    render,
  }
}
