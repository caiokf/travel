import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue'
import * as d3 from 'd3'

// Earth texture (equirectangular projection) - using unpkg for CORS support
const EARTH_TEXTURE_URL =
  'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg'

// Colors
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

  let projection: d3.GeoProjection | null = null
  let animationFrame: number | null = null

  // Earth texture
  let earthTexture: HTMLImageElement | null = null
  let textureCanvas: HTMLCanvasElement | null = null
  let textureCtx: CanvasRenderingContext2D | null = null
  let textureData: ImageData | null = null

  // Rotation state
  let currentRotation: [number, number, number] = [0, -20, 0] // [lambda, phi, gamma]
  let targetRotation: [number, number, number] | null = null
  let isAnimatingRotation = false

  // Auto-rotation state
  let lastTime = 0
  let isAutoRotating = autoRotate

  // Load Earth texture
  const loadTexture = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        earthTexture = img

        // Create offscreen canvas to read pixel data
        textureCanvas = document.createElement('canvas')
        textureCanvas.width = img.width
        textureCanvas.height = img.height
        textureCtx = textureCanvas.getContext('2d')

        if (textureCtx) {
          textureCtx.drawImage(img, 0, 0)
          textureData = textureCtx.getImageData(0, 0, img.width, img.height)
        }

        resolve()
      }
      img.onerror = reject
      img.src = EARTH_TEXTURE_URL
    })
  }

  // Sample texture at given lat/lon
  const sampleTexture = (
    lon: number,
    lat: number
  ): [number, number, number] | null => {
    if (!textureData || !earthTexture) return null

    // Convert lat/lon to texture coordinates (equirectangular)
    // lon: -180 to 180 -> 0 to width
    // lat: 90 to -90 -> 0 to height
    const x = ((lon + 180) / 360) * earthTexture.width
    const y = ((90 - lat) / 180) * earthTexture.height

    const px = Math.floor(x) % earthTexture.width
    const py = Math.max(0, Math.min(earthTexture.height - 1, Math.floor(y)))

    const idx = (py * earthTexture.width + px) * 4

    return [textureData.data[idx], textureData.data[idx + 1], textureData.data[idx + 2]]
  }

  // Load globe resources
  const loadGlobe = async (): Promise<void> => {
    // Set up orthographic projection first (always needed)
    const canvas = canvasRef.value
    if (canvas) {
      const size = Math.min(canvas.width, canvas.height) * 0.45

      projection = d3
        .geoOrthographic()
        .scale(size)
        .translate([canvas.width / 2, canvas.height / 2])
        .rotate(currentRotation)
        .clipAngle(90)
    }

    isLoaded.value = true

    // Try to load texture in background (non-blocking)
    try {
      await loadTexture()
      console.log('Earth texture loaded successfully')
    } catch (error) {
      console.warn('Failed to load Earth texture, using fallback colors:', error)
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

  // Draw textured globe with optimized rendering
  const drawTexturedGlobe = (ctx: CanvasRenderingContext2D): void => {
    if (!projection) return

    const canvas = canvasRef.value
    if (!canvas) return

    const [cx, cy] = projection.translate()
    const radius = projection.scale()

    // Fallback to gradient globe if texture not loaded
    if (!textureData || !earthTexture) {
      // Draw gradient globe (ocean blue with slight depth)
      const gradient = ctx.createRadialGradient(
        cx - radius * 0.3,
        cy - radius * 0.3,
        0,
        cx,
        cy,
        radius
      )
      gradient.addColorStop(0, '#4a90b8')
      gradient.addColorStop(0.5, '#2d6a8f')
      gradient.addColorStop(0.8, '#1a4b77')
      gradient.addColorStop(1, '#0d2840')

      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.restore()

      // Add atmosphere rim
      const rimGradient = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius * 1.02)
      rimGradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
      rimGradient.addColorStop(0.7, 'rgba(135, 206, 250, 0.15)')
      rimGradient.addColorStop(1, 'rgba(100, 180, 255, 0.4)')

      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, radius * 1.02, 0, Math.PI * 2)
      ctx.fillStyle = rimGradient
      ctx.fill()
      ctx.restore()
      return
    }

    // Calculate bounding box for the globe
    const x0 = Math.floor(cx - radius)
    const y0 = Math.floor(cy - radius)
    const x1 = Math.ceil(cx + radius)
    const y1 = Math.ceil(cy + radius)

    const width = x1 - x0
    const height = y1 - y0

    // Render at reduced resolution for performance, then scale up
    const scale = 2 // Render at 1/2 resolution
    const renderWidth = Math.ceil(width / scale)
    const renderHeight = Math.ceil(height / scale)

    // Create image data at reduced resolution
    const imageData = ctx.createImageData(renderWidth, renderHeight)
    const data = imageData.data

    const radiusSq = radius * radius

    // For each pixel in the reduced bounding box
    for (let py = 0; py < renderHeight; py++) {
      for (let px = 0; px < renderWidth; px++) {
        const screenX = x0 + px * scale
        const screenY = y0 + py * scale

        // Check if within globe circle (using squared distance)
        const dx = screenX - cx
        const dy = screenY - cy
        const distSq = dx * dx + dy * dy

        if (distSq <= radiusSq) {
          // Convert screen coordinates to lat/lon using inverse projection
          const coords = projection.invert?.([screenX, screenY])

          if (coords) {
            const [lon, lat] = coords

            // Sample the texture
            const color = sampleTexture(lon, lat)

            if (color) {
              const idx = (py * renderWidth + px) * 4
              data[idx] = color[0]
              data[idx + 1] = color[1]
              data[idx + 2] = color[2]
              data[idx + 3] = 255
            }
          }
        }
      }
    }

    // Draw the reduced resolution image scaled up
    // Create a temp canvas to scale up
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = renderWidth
    tempCanvas.height = renderHeight
    const tempCtx = tempCanvas.getContext('2d')

    if (tempCtx) {
      tempCtx.putImageData(imageData, 0, 0)

      // Draw scaled up with smoothing
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(tempCanvas, 0, 0, renderWidth, renderHeight, x0, y0, width, height)
    }

    // Add subtle atmosphere rim lighting
    const rimGradient = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.02)
    rimGradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
    rimGradient.addColorStop(0.6, 'rgba(135, 206, 250, 0.08)')
    rimGradient.addColorStop(0.85, 'rgba(135, 206, 250, 0.2)')
    rimGradient.addColorStop(1, 'rgba(100, 180, 255, 0.4)')

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, radius * 1.02, 0, Math.PI * 2)
    ctx.fillStyle = rimGradient
    ctx.fill()
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

    // Update projection to match current canvas size (handles initial sizing and resize)
    const size = Math.min(canvas.width, canvas.height) * 0.45
    if (size > 0) {
      projection.scale(size).translate([canvas.width / 2, canvas.height / 2])
    }

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

    // Draw in order: atmosphere, textured globe, journeys
    drawAtmosphere(ctx)
    drawTexturedGlobe(ctx)
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
    await loadGlobe()
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
