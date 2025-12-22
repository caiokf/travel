import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue'
import type { Waypoint } from '../types'

interface MapAnimationOptions {
  mapSvgUrl: string
  waypoints: Waypoint[]
  scrollProgress: Ref<number>
  canvasRef: Ref<HTMLCanvasElement | null>
}

interface PathData {
  trailPath: SVGPathElement | null
  cameraPath: SVGPathElement | null
  trailLength: number
  cameraLength: number
}

export function useMapAnimation(options: MapAnimationOptions) {
  const { mapSvgUrl, waypoints, scrollProgress, canvasRef } = options

  const isLoaded = ref(false)
  const cameraPosition = ref({ x: 0, y: 0 })
  const currentPathLength = ref(0)

  let svgDoc: Document | null = null
  let mapImage: HTMLImageElement | null = null
  let pathData: PathData = {
    trailPath: null,
    cameraPath: null,
    trailLength: 0,
    cameraLength: 0
  }
  let animationFrame: number | null = null
  let bufferCanvas: HTMLCanvasElement | null = null
  let bufferCtx: CanvasRenderingContext2D | null = null

  // Load SVG as both document (for path data) and image (for rendering)
  const loadMap = async (): Promise<void> => {
    try {
      // Fetch SVG as text and parse it
      const response = await fetch(mapSvgUrl)
      const svgText = await response.text()
      const parser = new DOMParser()
      svgDoc = parser.parseFromString(svgText, 'image/svg+xml')

      // Extract path elements (original SVG has paths inside groups)
      const trailGroup = svgDoc.querySelector('#trail-path')
      const cameraGroup = svgDoc.querySelector('#camera-path')

      // Get the path element from inside the group, or use the element directly if it's a path
      pathData.trailPath = trailGroup?.querySelector('path') as SVGPathElement ||
                           (trailGroup?.tagName === 'path' ? trailGroup as SVGPathElement : null)
      pathData.cameraPath = cameraGroup?.querySelector('path') as SVGPathElement ||
                            (cameraGroup?.tagName === 'path' ? cameraGroup as SVGPathElement : null)

      if (pathData.trailPath) {
        pathData.trailLength = pathData.trailPath.getTotalLength()
      }
      if (pathData.cameraPath) {
        pathData.cameraLength = pathData.cameraPath.getTotalLength()
      }

      // Load SVG as image for canvas rendering
      mapImage = new Image()
      mapImage.src = mapSvgUrl

      await new Promise<void>((resolve, reject) => {
        if (mapImage) {
          mapImage.onload = () => resolve()
          mapImage.onerror = reject
        }
      })

      // Create buffer canvas for performance
      createBufferCanvas()

      isLoaded.value = true
    } catch (error) {
      console.error('Failed to load map:', error)
    }
  }

  // Map dimensions - update these when changing maps
  const MAP_WIDTH = 2000
  const MAP_HEIGHT = 1400

  const createBufferCanvas = () => {
    if (!mapImage) return

    bufferCanvas = document.createElement('canvas')
    bufferCanvas.width = MAP_WIDTH * 2 // Higher resolution for quality
    bufferCanvas.height = MAP_HEIGHT * 2
    bufferCtx = bufferCanvas.getContext('2d')

    if (bufferCtx && mapImage) {
      bufferCtx.scale(2, 2)
      bufferCtx.drawImage(mapImage, 0, 0, MAP_WIDTH, MAP_HEIGHT)
    }
  }

  const getPointOnPath = (path: SVGPathElement | null, progress: number): { x: number; y: number } => {
    if (!path) return { x: 0, y: 0 }

    const length = path.getTotalLength()
    const point = path.getPointAtLength(length * progress)
    return { x: point.x, y: point.y }
  }

  const render = () => {
    const canvas = canvasRef.value
    if (!canvas || !isLoaded.value || !bufferCanvas || !bufferCtx) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const progress = scrollProgress.value

    // Get camera position from camera path
    const camPos = getPointOnPath(pathData.cameraPath, progress)
    cameraPosition.value = camPos

    // Calculate viewport
    const mapWidth = MAP_WIDTH
    const mapHeight = MAP_HEIGHT
    const viewportWidth = canvas.width
    const viewportHeight = canvas.height

    // Zoom level based on progress (closer zoom when progressing)
    const baseZoom = 1.5
    const zoom = baseZoom + Math.sin(progress * Math.PI) * 0.3

    // Calculate the viewport offset to center on camera position
    const scaledWidth = mapWidth * zoom
    const scaledHeight = mapHeight * zoom
    const offsetX = camPos.x * zoom - viewportWidth / 2
    const offsetY = camPos.y * zoom - viewportHeight / 2

    // Clamp offsets to keep map in bounds
    const clampedOffsetX = Math.max(0, Math.min(scaledWidth - viewportWidth, offsetX))
    const clampedOffsetY = Math.max(0, Math.min(scaledHeight - viewportHeight, offsetY))

    // Clear canvas
    ctx.clearRect(0, 0, viewportWidth, viewportHeight)

    // Save context state
    ctx.save()

    // Apply transformations
    ctx.translate(-clampedOffsetX, -clampedOffsetY)
    ctx.scale(zoom, zoom)

    // Draw the base map from buffer
    if (bufferCanvas) {
      ctx.drawImage(bufferCanvas, 0, 0, bufferCanvas.width, bufferCanvas.height, 0, 0, mapWidth, mapHeight)
    }

    // Draw animated trail path
    drawAnimatedTrail(ctx, progress)

    // Draw waypoint markers
    drawWaypoints(ctx, progress)

    // Draw current position marker
    drawCurrentPosition(ctx, progress)

    ctx.restore()
  }

  const drawAnimatedTrail = (ctx: CanvasRenderingContext2D, progress: number) => {
    if (!pathData.trailPath) return

    const length = pathData.trailLength * progress
    currentPathLength.value = length

    // Create a new path for drawing
    ctx.save()
    ctx.strokeStyle = '#c75050'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash([8, 4])

    // Draw the path up to current progress
    const pathString = pathData.trailPath.getAttribute('d')
    if (pathString) {
      // Draw animated portion of the path
      ctx.beginPath()

      // Get points along the path to create a clip region
      const points: { x: number; y: number }[] = []
      const steps = Math.ceil(progress * 100)
      for (let i = 0; i <= steps; i++) {
        const t = i / 100
        if (t <= progress) {
          const point = getPointOnPath(pathData.trailPath, t)
          points.push(point)
        }
      }

      if (points.length > 1) {
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y)
        }
        ctx.stroke()
      }
    }

    ctx.restore()
  }

  const drawWaypoints = (ctx: CanvasRenderingContext2D, progress: number) => {
    waypoints.forEach((waypoint) => {
      const isActive = progress >= waypoint.pathPosition
      const isCurrentOrPast = progress >= waypoint.pathPosition - 0.05

      ctx.save()

      // Glow effect for active waypoints
      if (isActive) {
        ctx.shadowColor = '#d4a84b'
        ctx.shadowBlur = 10
      }

      // Draw waypoint circle
      ctx.beginPath()
      ctx.arc(waypoint.x, waypoint.y, isCurrentOrPast ? 8 : 5, 0, Math.PI * 2)
      ctx.fillStyle = isActive ? '#d4a84b' : '#8a9a9e'
      ctx.fill()
      ctx.strokeStyle = isActive ? '#b8923f' : '#6a787c'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.restore()
    })
  }

  const drawCurrentPosition = (ctx: CanvasRenderingContext2D, progress: number) => {
    if (progress <= 0) return

    const pos = getPointOnPath(pathData.trailPath, progress)

    ctx.save()

    // Pulsing effect
    const pulseScale = 1 + Math.sin(Date.now() / 200) * 0.15

    // Draw outer glow
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 10 * pulseScale, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(199, 80, 80, 0.25)'
    ctx.fill()

    // Draw inner circle
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#c75050'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
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

  // Watch for scroll progress changes
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
    currentPathLength,
    render
  }
}
