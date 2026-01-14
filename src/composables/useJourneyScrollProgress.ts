import { ref, onMounted, onUnmounted, computed, watch, nextTick, type Ref } from 'vue'
import type { JourneyWaypoint } from '../types'

export interface WaypointWithProgress extends JourneyWaypoint {
  pathPosition: number
}

interface WaypointDOMPosition {
  id: string
  top: number      // scroll position where this waypoint section starts
  bottom: number   // scroll position where this waypoint section ends
}

export function useJourneyScrollProgress(waypoints: Ref<JourneyWaypoint[]>) {
  const scrollProgress = ref(0)
  const currentWaypointIndex = ref(0)
  const isScrolling = ref(false)

  // DOM-based positions for each waypoint
  const waypointDOMPositions = ref<WaypointDOMPosition[]>([])

  // Content boundaries (where story sections start and end)
  const contentStart = ref(0)
  const contentEnd = ref(0)

  let scrollTimeout: number | null = null
  let resizeObserver: ResizeObserver | null = null

  // Calculate path positions from actual DOM element positions
  const waypointsWithProgress = computed<WaypointWithProgress[]>(() => {
    const wps = waypoints.value
    const domPositions = waypointDOMPositions.value

    if (wps.length === 0) return []
    if (wps.length === 1) return [{ ...wps[0], pathPosition: 0 }]

    // If we don't have DOM positions yet, fall back to even distribution
    if (domPositions.length === 0) {
      return wps.map((wp, i) => ({
        ...wp,
        pathPosition: i / (wps.length - 1),
      }))
    }

    const totalContentHeight = contentEnd.value - contentStart.value
    if (totalContentHeight <= 0) {
      return wps.map((wp, i) => ({
        ...wp,
        pathPosition: i / (wps.length - 1),
      }))
    }

    // Map each waypoint to its pathPosition based on where its section starts in the DOM
    return wps.map((wp) => {
      const domPos = domPositions.find(d => d.id === wp.id)
      if (!domPos) {
        // Fallback for waypoints without DOM elements
        const index = wps.findIndex(w => w.id === wp.id)
        return {
          ...wp,
          pathPosition: index / (wps.length - 1),
        }
      }

      // Calculate position as ratio of where section starts within total content
      const relativePosition = (domPos.top - contentStart.value) / totalContentHeight
      return {
        ...wp,
        pathPosition: Math.max(0, Math.min(1, relativePosition)),
      }
    })
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

  // Scan DOM for waypoint section positions
  const updateWaypointDOMPositions = () => {
    const sections = document.querySelectorAll('[data-waypoint-id]')
    if (sections.length === 0) return

    const positions: WaypointDOMPosition[] = []

    sections.forEach((section) => {
      const id = section.getAttribute('data-waypoint-id')
      if (!id) return

      const rect = section.getBoundingClientRect()
      const scrollTop = window.scrollY

      positions.push({
        id,
        top: rect.top + scrollTop,
        bottom: rect.bottom + scrollTop,
      })
    })

    // Sort by top position
    positions.sort((a, b) => a.top - b.top)

    if (positions.length > 0) {
      // Content starts at the first waypoint section
      contentStart.value = positions[0].top
      // Content ends at the bottom of the last waypoint section
      contentEnd.value = positions[positions.length - 1].bottom
    }

    waypointDOMPositions.value = positions
  }

  const updateScrollProgress = () => {
    const positions = waypointDOMPositions.value

    if (positions.length === 0) {
      // Fallback to old behavior if no DOM positions
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const currentScroll = window.scrollY
      const startOffset = window.innerHeight * 2
      const endOffset = window.innerHeight * 1
      const adjustedScroll = Math.max(0, currentScroll - startOffset)
      const adjustedScrollHeight = Math.max(1, scrollHeight - startOffset - endOffset)
      scrollProgress.value = Math.max(0, Math.min(1, adjustedScroll / adjustedScrollHeight))
    } else {
      // Calculate progress based on current scroll position relative to content
      // When a section's top reaches the top of the viewport, path should be at that waypoint
      const currentScroll = window.scrollY
      const totalHeight = contentEnd.value - contentStart.value

      if (totalHeight <= 0) {
        scrollProgress.value = 0
      } else {
        const relativeScroll = currentScroll - contentStart.value
        scrollProgress.value = Math.max(0, Math.min(1, relativeScroll / totalHeight))
      }
    }

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
    const domPos = waypointDOMPositions.value.find(p => p.id === waypointId)
    if (domPos) {
      window.scrollTo({
        top: domPos.top,
        behavior: 'smooth',
      })
      return
    }

    // Fallback to calculated position
    const waypoint = waypointsWithProgress.value.find((w) => w.id === waypointId)
    if (!waypoint) return

    const totalHeight = contentEnd.value - contentStart.value
    const targetScroll = contentStart.value + waypoint.pathPosition * totalHeight

    window.scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    })
  }

  // Setup resize observer to recalculate positions when content changes size
  const setupResizeObserver = () => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }

    resizeObserver = new ResizeObserver(() => {
      updateWaypointDOMPositions()
    })

    // Observe the main content container
    const textContainer = document.querySelector('.text')
    if (textContainer) {
      resizeObserver.observe(textContainer)
    }
  }

  // Watch for waypoint changes and re-scan DOM
  watch(waypoints, async () => {
    await nextTick()
    // Small delay to ensure DOM is fully rendered
    setTimeout(() => {
      updateWaypointDOMPositions()
      updateScrollProgress()
    }, 100)
  }, { deep: true })

  onMounted(() => {
    window.addEventListener('scroll', updateScrollProgress, { passive: true })
    window.addEventListener('resize', updateWaypointDOMPositions, { passive: true })

    // Initial scan after a small delay to ensure content is rendered
    setTimeout(() => {
      updateWaypointDOMPositions()
      setupResizeObserver()
      updateScrollProgress()
    }, 200)
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', updateScrollProgress)
    window.removeEventListener('resize', updateWaypointDOMPositions)
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
    if (resizeObserver) {
      resizeObserver.disconnect()
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
