import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue'
import * as d3 from 'd3'
import type { FeatureCollection, Feature, Geometry } from 'geojson'
import type { Waypoint } from '../types'

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
  lyon: [4.8357, 45.7640],
  paris: [2.3522, 48.8566]
}

// Countries to highlight (our journey passes through)
const journeyCountries = ['Portugal', 'Spain', 'France']

// Countries to show for context
const contextCountries = [
  'United Kingdom', 'Ireland', 'Belgium', 'Netherlands', 'Luxembourg',
  'Germany', 'Switzerland', 'Italy', 'Andorra', 'Monaco'
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

  // Load GeoJSON data
  const loadMap = async (): Promise<void> => {
    try {
      const response = await fetch(geoJsonUrl)
      geoData = await response.json()

      // Set up projection centered on Western Europe
      // Focus on the area from Portugal to France
      projection = d3.geoMercator()
        .center([-2, 43]) // Center between Spain and France
        .scale(1800)
        .translate([1000, 700])

      pathGenerator = d3.geoPath().projection(projection)

      // Calculate projected coordinates for waypoints
      projectedWaypoints = waypoints.map(wp => {
        const coords = cityCoordinates[wp.id]
        if (coords && projection) {
          const projected = projection(coords)
          return {
            id: wp.id,
            x: projected ? projected[0] : 0,
            y: projected ? projected[1] : 0
          }
        }
        return { id: wp.id, x: 0, y: 0 }
      })

      // Create smooth path through cities using curve
      projectedPath = projectedWaypoints.map(wp => [wp.x, wp.y] as [number, number])

      isLoaded.value = true
    } catch (error) {
      console.error('Failed to load map:', error)
    }
  }

  // Get point along the journey path at given progress (0-1)
  const getPointOnPath = (progress: number): { x: number; y: number } => {
    if (projectedPath.length < 2) return { x: 0, y: 0 }

    const totalSegments = projectedPath.length - 1
    const segmentProgress = progress * totalSegments
    const segmentIndex = Math.min(Math.floor(segmentProgress), totalSegments - 1)
    const segmentT = segmentProgress - segmentIndex

    const p1 = projectedPath[segmentIndex]
    const p2 = projectedPath[Math.min(segmentIndex + 1, projectedPath.length - 1)]

    return {
      x: p1[0] + (p2[0] - p1[0]) * segmentT,
      y: p1[1] + (p2[1] - p1[1]) * segmentT
    }
  }

  const render = () => {
    const canvas = canvasRef.value
    if (!canvas || !isLoaded.value || !geoData || !projection || !pathGenerator) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const progress = scrollProgress.value
    const currentPos = getPointOnPath(progress)
    cameraPosition.value = currentPos

    const viewportWidth = canvas.width
    const viewportHeight = canvas.height

    // Dynamic zoom and pan based on progress
    const baseZoom = 1.2
    const zoom = baseZoom + Math.sin(progress * Math.PI) * 0.4

    // Calculate viewport offset to follow the journey
    const offsetX = currentPos.x * zoom - viewportWidth / 2
    const offsetY = currentPos.y * zoom - viewportHeight / 2

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

  const drawTrail = (ctx: CanvasRenderingContext2D, progress: number, zoom: number) => {
    if (projectedPath.length < 2) return

    // Calculate how much of the path to draw
    const totalSegments = projectedPath.length - 1
    const progressSegments = progress * totalSegments
    const fullSegments = Math.floor(progressSegments)
    const partialProgress = progressSegments - fullSegments

    // Build the visible path points
    const visiblePoints: [number, number][] = []
    for (let i = 0; i <= fullSegments && i < projectedPath.length; i++) {
      visiblePoints.push(projectedPath[i])
    }

    // Add partial segment endpoint
    if (fullSegments < totalSegments && partialProgress > 0) {
      const p1 = projectedPath[fullSegments]
      const p2 = projectedPath[fullSegments + 1]
      visiblePoints.push([
        p1[0] + (p2[0] - p1[0]) * partialProgress,
        p1[1] + (p2[1] - p1[1]) * partialProgress
      ])
    }

    if (visiblePoints.length < 2) return

    // Draw trail shadow
    ctx.save()
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.lineWidth = 6 / zoom
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(visiblePoints[0][0] + 2, visiblePoints[0][1] + 2)
    for (let i = 1; i < visiblePoints.length; i++) {
      ctx.lineTo(visiblePoints[i][0] + 2, visiblePoints[i][1] + 2)
    }
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
    ctx.moveTo(visiblePoints[0][0], visiblePoints[0][1])
    for (let i = 1; i < visiblePoints.length; i++) {
      ctx.lineTo(visiblePoints[i][0], visiblePoints[i][1])
    }
    ctx.stroke()
    ctx.restore()
  }

  const drawWaypoints = (ctx: CanvasRenderingContext2D, progress: number, zoom: number) => {
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

  const drawCurrentPosition = (ctx: CanvasRenderingContext2D, progress: number, zoom: number) => {
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
    render
  }
}
