import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue'
import * as d3 from 'd3'
import type { FeatureCollection, Feature, Geometry } from 'geojson'
import * as topojson from 'topojson-client'

// World Atlas TopoJSON URL (Natural Earth 110m for performance)
const WORLD_ATLAS_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Colors
const OCEAN_COLOR = '#d4dde6'
const LAND_COLOR = '#e8edef'
const DEFAULT_ARC_COLOR = '#c75050'

export interface GlobeJourney {
  id: string
  coordinates: [number, number][] // Array of [lng, lat] points along the journey
  color?: string
}

export interface GlobeOptions {
  canvasRef: Ref<HTMLCanvasElement | null>
  journeys: Ref<GlobeJourney[]>
  focusedJourneyId: Ref<string | null>
  autoRotate?: boolean
  rotationSpeed?: number
}

export function useGlobe(options: GlobeOptions) {
  const {
    canvasRef,
    journeys,
    focusedJourneyId,
    autoRotate = true,
    rotationSpeed = 0.2,
  } = options

  const isLoaded = ref(false)

  let worldData: FeatureCollection | null = null
  let projection: d3.GeoProjection | null = null
  let pathGenerator: d3.GeoPath | null = null
  let animationFrame: number | null = null

  // Rotation state
  let currentRotation: [number, number, number] = [0, -20, 0] // [lambda, phi, gamma]
  let targetRotation: [number, number, number] | null = null
  let isAnimatingRotation = false

  // Auto-rotation state
  let lastTime = 0
  let isAutoRotating = autoRotate

  // Load world geography data
  const loadWorld = async (): Promise<void> => {
    try {
      const response = await fetch(WORLD_ATLAS_URL)
      const topoData = await response.json()

      // Convert TopoJSON to GeoJSON
      worldData = topojson.feature(
        topoData,
        topoData.objects.countries
      ) as unknown as FeatureCollection

      // Set up orthographic projection
      const canvas = canvasRef.value
      if (canvas) {
        const size = Math.min(canvas.width, canvas.height) * 0.45

        projection = d3
          .geoOrthographic()
          .scale(size)
          .translate([canvas.width / 2, canvas.height / 2])
          .rotate(currentRotation)
          .clipAngle(90)

        pathGenerator = d3.geoPath().projection(projection).context(null)
      }

      isLoaded.value = true
    } catch (error) {
      console.error('Failed to load world data:', error)
    }
  }

  // Get the centroid of a journey for focusing
  const getJourneyCentroid = (
    journey: GlobeJourney
  ): [number, number] | null => {
    if (!journey.coordinates || journey.coordinates.length === 0) return null

    // Calculate the average of all coordinates
    let sumLng = 0
    let sumLat = 0
    for (const coord of journey.coordinates) {
      sumLng += coord[0]
      sumLat += coord[1]
    }

    return [
      sumLng / journey.coordinates.length,
      sumLat / journey.coordinates.length,
    ]
  }

  // Smooth rotation to focus on a specific location
  const rotateTo = (lng: number, lat: number): void => {
    // Target rotation centers the point on the globe
    targetRotation = [-lng, -lat, 0]
    isAnimatingRotation = true
    isAutoRotating = false
  }

  // Focus on a specific journey
  const focusOnJourney = (journeyId: string): void => {
    const journey = journeys.value.find((j) => j.id === journeyId)
    if (!journey) return

    const centroid = getJourneyCentroid(journey)
    if (centroid) {
      rotateTo(centroid[0], centroid[1])
    }
  }

  // Reset to auto-rotation
  const resetRotation = (): void => {
    isAutoRotating = autoRotate
    isAnimatingRotation = false
    targetRotation = null
  }

  // Interpolate great circle arc points
  const getGreatCircleArc = (
    start: [number, number],
    end: [number, number],
    numPoints = 50
  ): [number, number][] => {
    const interpolate = d3.geoInterpolate(start, end)
    const points: [number, number][] = []

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints
      const point = interpolate(t)
      points.push(point as [number, number])
    }

    return points
  }

  // Check if a point is visible on the front of the globe
  const isPointVisible = (point: [number, number]): boolean => {
    if (!projection) return false

    const rotate = projection.rotate()
    const center: [number, number] = [-rotate[0], -rotate[1]]

    // Calculate angular distance from center
    const distance = d3.geoDistance(point, center)

    // Point is visible if angular distance < 90 degrees (pi/2 radians)
    return distance < Math.PI / 2
  }

  // Draw atmosphere glow effect
  const drawAtmosphere = (ctx: CanvasRenderingContext2D): void => {
    if (!projection) return

    const canvas = canvasRef.value
    if (!canvas) return

    const [cx, cy] = projection.translate()
    const radius = projection.scale()

    // Create radial gradient for atmosphere glow
    const glowRadius = radius * 1.15
    const gradient = ctx.createRadialGradient(
      cx,
      cy,
      radius,
      cx,
      cy,
      glowRadius
    )

    gradient.addColorStop(0, 'rgba(135, 206, 250, 0)')
    gradient.addColorStop(0.5, 'rgba(135, 206, 250, 0.1)')
    gradient.addColorStop(0.8, 'rgba(135, 206, 250, 0.05)')
    gradient.addColorStop(1, 'rgba(135, 206, 250, 0)')

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()
    ctx.restore()
  }

  // Draw the ocean (globe background)
  const drawOcean = (ctx: CanvasRenderingContext2D): void => {
    if (!projection) return

    const [cx, cy] = projection.translate()
    const radius = projection.scale()

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fillStyle = OCEAN_COLOR
    ctx.fill()
    ctx.restore()
  }

  // Draw land masses
  const drawLand = (ctx: CanvasRenderingContext2D): void => {
    if (!worldData || !pathGenerator || !projection) return

    ctx.save()

    // Update path generator with canvas context
    const canvasPathGenerator = d3.geoPath().projection(projection).context(ctx)

    ctx.beginPath()
    worldData.features.forEach((feature: Feature<Geometry>) => {
      canvasPathGenerator(feature)
    })
    ctx.fillStyle = LAND_COLOR
    ctx.fill()

    // Draw country borders
    ctx.beginPath()
    worldData.features.forEach((feature: Feature<Geometry>) => {
      canvasPathGenerator(feature)
    })
    ctx.strokeStyle = '#c8d4d8'
    ctx.lineWidth = 0.5
    ctx.stroke()

    ctx.restore()
  }

  // Draw journey arcs
  const drawJourneys = (ctx: CanvasRenderingContext2D): void => {
    if (!projection) return

    // Store projection locally to help TypeScript understand it's not null
    const proj = projection
    const focusedId = focusedJourneyId.value

    journeys.value.forEach((journey) => {
      const isFocused = journey.id === focusedId
      const arcColor = journey.color || DEFAULT_ARC_COLOR

      // Draw arc segments between consecutive coordinates
      for (let i = 0; i < journey.coordinates.length - 1; i++) {
        const start = journey.coordinates[i]
        const end = journey.coordinates[i + 1]

        // Get great circle arc points
        const arcPoints = getGreatCircleArc(start, end, 50)

        ctx.save()
        ctx.beginPath()

        let started = false
        let prevVisible = false

        for (let j = 0; j < arcPoints.length; j++) {
          const point = arcPoints[j]
          const projected = proj(point)
          const visible = isPointVisible(point)

          if (projected) {
            if (!started || (visible && !prevVisible)) {
              ctx.moveTo(projected[0], projected[1])
              started = true
            } else if (visible) {
              ctx.lineTo(projected[0], projected[1])
            }
          }

          prevVisible = visible
        }

        ctx.strokeStyle = arcColor
        ctx.lineWidth = isFocused ? 3 : 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        if (isFocused) {
          ctx.shadowColor = arcColor
          ctx.shadowBlur = 6
        }

        ctx.stroke()
        ctx.restore()
      }

      // Draw waypoint markers
      journey.coordinates.forEach((coord, index) => {
        const projected = proj(coord)
        const visible = isPointVisible(coord)

        if (projected && visible) {
          ctx.save()

          const isEndpoint =
            index === 0 || index === journey.coordinates.length - 1
          const radius = isFocused ? (isEndpoint ? 6 : 4) : isEndpoint ? 5 : 3

          // Outer circle
          ctx.beginPath()
          ctx.arc(projected[0], projected[1], radius, 0, Math.PI * 2)
          ctx.fillStyle = arcColor
          ctx.fill()

          // Inner circle for endpoints
          if (isEndpoint) {
            ctx.beginPath()
            ctx.arc(projected[0], projected[1], radius * 0.5, 0, Math.PI * 2)
            ctx.fillStyle = '#ffffff'
            ctx.fill()
          }

          ctx.restore()
        }
      })
    })
  }

  // Smooth interpolation between rotations
  const lerpRotation = (
    current: [number, number, number],
    target: [number, number, number],
    factor: number
  ): [number, number, number] => {
    return [
      current[0] + (target[0] - current[0]) * factor,
      current[1] + (target[1] - current[1]) * factor,
      current[2] + (target[2] - current[2]) * factor,
    ]
  }

  // Main render function
  const render = (timestamp: number): void => {
    const canvas = canvasRef.value
    if (!canvas || !isLoaded.value || !projection) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Calculate delta time for smooth animation
    const deltaTime = timestamp - lastTime
    lastTime = timestamp

    // Update rotation
    if (isAnimatingRotation && targetRotation) {
      currentRotation = lerpRotation(currentRotation, targetRotation, 0.05)

      // Check if we've reached the target
      const distance = Math.sqrt(
        Math.pow(currentRotation[0] - targetRotation[0], 2) +
          Math.pow(currentRotation[1] - targetRotation[1], 2)
      )

      if (distance < 0.1) {
        currentRotation = [...targetRotation] as [number, number, number]
        isAnimatingRotation = false
      }
    } else if (isAutoRotating) {
      // Auto-rotate the globe
      currentRotation[0] += (rotationSpeed * deltaTime) / 1000
    }

    // Apply rotation to projection
    projection.rotate(currentRotation)

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw in order: atmosphere, ocean, land, journeys
    drawAtmosphere(ctx)
    drawOcean(ctx)
    drawLand(ctx)
    drawJourneys(ctx)
  }

  // Animation loop
  const startAnimation = (): void => {
    const animate = (timestamp: number): void => {
      render(timestamp)
      animationFrame = requestAnimationFrame(animate)
    }
    animationFrame = requestAnimationFrame(animate)
  }

  const stopAnimation = (): void => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }

  // Handle canvas resize
  const handleResize = (): void => {
    const canvas = canvasRef.value
    if (!canvas || !projection) return

    const size = Math.min(canvas.width, canvas.height) * 0.45

    projection.scale(size).translate([canvas.width / 2, canvas.height / 2])
  }

  // Watch for focused journey changes
  watch(focusedJourneyId, (newId) => {
    if (newId) {
      focusOnJourney(newId)
    } else {
      resetRotation()
    }
  })

  // Watch for journey changes
  watch(
    journeys,
    () => {
      // Re-render when journeys change
    },
    { deep: true }
  )

  onMounted(async () => {
    await loadWorld()
    startAnimation()

    // Handle resize events
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    stopAnimation()
    window.removeEventListener('resize', handleResize)
  })

  return {
    isLoaded,
    focusOnJourney,
    resetRotation,
  }
}
