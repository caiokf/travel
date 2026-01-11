<script setup lang="ts">
  import { computed } from 'vue'

  const props = withDefaults(
    defineProps<{
      coordinates: [number, number][] // [lng, lat] array
      color?: string
      width?: number
      height?: number
    }>(),
    {
      color: '#c75050',
      width: 120,
      height: 40,
    }
  )

  // Normalize coordinates to fit SVG viewport with padding
  const normalizedPath = computed(() => {
    if (props.coordinates.length < 2) return ''

    const padding = 8
    const viewWidth = props.width - padding * 2
    const viewHeight = props.height - padding * 2

    // Find bounds
    const lngs = props.coordinates.map((c) => c[0])
    const lats = props.coordinates.map((c) => c[1])
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    const lngRange = maxLng - minLng || 1
    const latRange = maxLat - minLat || 1

    // Normalize to SVG coordinates
    const points = props.coordinates.map((coord) => ({
      x: padding + ((coord[0] - minLng) / lngRange) * viewWidth,
      y: padding + ((maxLat - coord[1]) / latRange) * viewHeight, // Flip Y axis
    }))

    // Create smooth bezier curve through points
    if (points.length === 2) {
      // Simple arc for two points
      const midX = (points[0].x + points[1].x) / 2
      const midY = Math.min(points[0].y, points[1].y) - viewHeight * 0.3
      return `M ${points[0].x} ${points[0].y} Q ${midX} ${midY} ${points[1].x} ${points[1].y}`
    }

    // For multiple points, create a smooth path
    let path = `M ${points[0].x} ${points[0].y}`

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(points.length - 1, i + 2)]

      // Calculate control points using Catmull-Rom to Bezier conversion
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }

    return path
  })

  // Generate dot positions
  const dots = computed(() => {
    if (props.coordinates.length < 2) return []

    const padding = 8
    const viewWidth = props.width - padding * 2
    const viewHeight = props.height - padding * 2

    const lngs = props.coordinates.map((c) => c[0])
    const lats = props.coordinates.map((c) => c[1])
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    const lngRange = maxLng - minLng || 1
    const latRange = maxLat - minLat || 1

    return props.coordinates.map((coord, index) => ({
      x: padding + ((coord[0] - minLng) / lngRange) * viewWidth,
      y: padding + ((maxLat - coord[1]) / latRange) * viewHeight,
      isEndpoint: index === 0 || index === props.coordinates.length - 1,
    }))
  })
</script>

<template>
  <svg
    class="route-preview"
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
  >
    <!-- Route path -->
    <path
      v-if="normalizedPath"
      :d="normalizedPath"
      fill="none"
      :stroke="color"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="route-preview__path"
    />

    <!-- Waypoint dots -->
    <circle
      v-for="(dot, index) in dots"
      :key="index"
      :cx="dot.x"
      :cy="dot.y"
      :r="dot.isEndpoint ? 3 : 2"
      :fill="dot.isEndpoint ? color : '#fff'"
      :stroke="color"
      stroke-width="1.5"
      class="route-preview__dot"
    />
  </svg>
</template>

<style scoped>
  .route-preview {
    display: block;
    flex-shrink: 0;
  }

  .route-preview__path {
    opacity: 0.8;
  }

  .route-preview__dot {
    transition: r 0.2s ease;
  }
</style>
