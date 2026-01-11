import { ref, onMounted, onUnmounted, computed, type Ref } from 'vue'
import type { JourneyWaypoint } from '../types'

export interface WaypointWithProgress extends JourneyWaypoint {
  pathPosition: number
}

export function useJourneyScrollProgress(waypoints: Ref<JourneyWaypoint[]>) {
  const scrollProgress = ref(0)
  const currentWaypointIndex = ref(0)
  const isScrolling = ref(false)

  let scrollTimeout: number | null = null

  // Calculate path positions dynamically from waypoint order
  const waypointsWithProgress = computed<WaypointWithProgress[]>(() => {
    const wps = waypoints.value
    if (wps.length === 0) return []
    if (wps.length === 1) return [{ ...wps[0], pathPosition: 0 }]

    return wps.map((wp, i) => ({
      ...wp,
      pathPosition: i / (wps.length - 1),
    }))
  })

  const currentWaypoint = computed(() => {
    return waypointsWithProgress.value[currentWaypointIndex.value] || null
  })

  const nextWaypoint = computed(() => {
    return waypointsWithProgress.value[currentWaypointIndex.value + 1] || null
  })

  const progressBetweenWaypoints = computed(() => {
    const current = currentWaypoint.value
    const next = nextWaypoint.value

    if (!current || !next) return 0

    const segmentStart = current.pathPosition
    const segmentEnd = next.pathPosition
    const segmentLength = segmentEnd - segmentStart

    if (segmentLength === 0) return 0

    const progressInSegment = scrollProgress.value - segmentStart
    return Math.max(0, Math.min(1, progressInSegment / segmentLength))
  })

  const updateScrollProgress = () => {
    const scrollHeight =
      document.documentElement.scrollHeight - window.innerHeight
    const currentScroll = window.scrollY

    // Offset to skip hero and intro sections (approximately 2 viewport heights)
    const startOffset = window.innerHeight * 2
    // Offset to finish map movement before footer (approximately 1 viewport height)
    const endOffset = window.innerHeight * 1

    const adjustedScroll = Math.max(0, currentScroll - startOffset)
    const adjustedScrollHeight = Math.max(
      1,
      scrollHeight - startOffset - endOffset
    )

    const progress =
      adjustedScrollHeight > 0 ? adjustedScroll / adjustedScrollHeight : 0

    scrollProgress.value = Math.max(0, Math.min(1, progress))

    // Find current waypoint based on progress
    const wps = waypointsWithProgress.value
    let newIndex = 0
    for (let i = wps.length - 1; i >= 0; i--) {
      if (scrollProgress.value >= wps[i].pathPosition) {
        newIndex = i
        break
      }
    }
    currentWaypointIndex.value = newIndex

    // Track scrolling state
    isScrolling.value = true
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
    scrollTimeout = window.setTimeout(() => {
      isScrolling.value = false
    }, 150)
  }

  const scrollToWaypoint = (waypointId: string) => {
    const waypoint = waypointsWithProgress.value.find((w) => w.id === waypointId)
    if (!waypoint) return

    const scrollHeight =
      document.documentElement.scrollHeight - window.innerHeight
    const startOffset = window.innerHeight * 2
    const endOffset = window.innerHeight * 1
    const adjustedScrollHeight = scrollHeight - startOffset - endOffset

    const targetScroll = startOffset + waypoint.pathPosition * adjustedScrollHeight

    window.scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    })
  }

  onMounted(() => {
    window.addEventListener('scroll', updateScrollProgress, { passive: true })
    updateScrollProgress()
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', updateScrollProgress)
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
  })

  return {
    scrollProgress,
    currentWaypointIndex,
    currentWaypoint,
    nextWaypoint,
    progressBetweenWaypoints,
    waypointsWithProgress,
    isScrolling,
    scrollToWaypoint,
  }
}
