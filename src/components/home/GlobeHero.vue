<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import type { Trip } from '../../types'
  import { useGlobe, type GlobeJourney } from '../../composables/useGlobe'

  const props = defineProps<{
    trips: Trip[]
    focusedTripId: string | null
  }>()

  // Canvas reference
  const canvasRef = ref<HTMLCanvasElement | null>(null)

  // Convert trips to globe journeys format
  const globeJourneys = computed<GlobeJourney[]>(() => {
    return props.trips
      .filter((trip) => trip.coordinates && trip.coordinates.length >= 2)
      .map((trip) => ({
        id: trip.id,
        coordinates: trip.coordinates as [number, number][],
        color: trip.status === 'planned' ? '#9d9c95' : '#c75050',
      }))
  })

  // Focused journey ID as a ref for the composable
  const focusedJourneyId = computed(() => props.focusedTripId)

  // Calculate stats from trips
  const stats = computed(() => {
    const completedTrips = props.trips.filter((t) => t.status === 'completed')
    const countries = new Set<string>()
    let totalCities = 0

    completedTrips.forEach((trip) => {
      if (trip.countries) {
        trip.countries.forEach((c) => countries.add(c))
      }
      if (trip.cities) {
        totalCities += trip.cities
      }
    })

    return {
      journeys: completedTrips.length,
      countries: countries.size,
      cities: totalCities,
    }
  })

  // Initialize globe (isLoaded used for loading state class)
  const { isLoaded } = useGlobe({
    canvasRef,
    journeys: globeJourneys,
    focusedJourneyId,
    autoRotate: true,
    rotationSpeed: 8,
  })

  // Handle canvas resize
  function handleResize() {
    const canvas = canvasRef.value
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    const rect = container.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
  }

  onMounted(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
</script>

<template>
  <header class="globe-hero" :class="{ 'globe-hero--loaded': isLoaded }">
    <div class="globe-hero__canvas-container">
      <canvas ref="canvasRef" class="globe-hero__canvas"></canvas>
      <div class="globe-hero__gradient-overlay"></div>
    </div>

    <div class="globe-hero__content">
      <h1 class="globe-hero__title">
        <span class="globe-hero__title-main">Travel Journeys</span>
        <span class="globe-hero__title-part">Stories from the Road</span>
      </h1>

      <p class="globe-hero__description">
        Explore interactive storytelling journeys through beautiful
        destinations. Scroll through maps, discover stories, and experience
        travel adventures.
      </p>

      <div class="globe-hero__stats">
        <div class="globe-hero__stat">
          <span class="globe-hero__stat-value">{{ stats.journeys }}</span>
          <span class="globe-hero__stat-label">Journeys</span>
        </div>
        <div class="globe-hero__stat-divider"></div>
        <div class="globe-hero__stat">
          <span class="globe-hero__stat-value">{{ stats.countries }}</span>
          <span class="globe-hero__stat-label">Countries</span>
        </div>
        <div class="globe-hero__stat-divider"></div>
        <div class="globe-hero__stat">
          <span class="globe-hero__stat-value">{{ stats.cities }}</span>
          <span class="globe-hero__stat-label">Cities</span>
        </div>
      </div>

      <div class="globe-hero__scroll-hint">
        <span>Scroll to explore</span>
        <svg
          class="globe-hero__scroll-icon"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </header>
</template>

<style scoped>
  .globe-hero {
    position: relative;
    height: 100vh;
    min-height: 600px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #181922;
  }

  .globe-hero__canvas-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  .globe-hero__canvas {
    width: 100%;
    height: 100%;
    display: block;
    opacity: 0;
    transition: opacity 0.8s ease;
  }

  .globe-hero--loaded .globe-hero__canvas {
    opacity: 1;
  }

  .globe-hero__gradient-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background:
      radial-gradient(
        ellipse at center,
        transparent 20%,
        rgba(24, 25, 34, 0.4) 60%,
        rgba(24, 25, 34, 0.9) 100%
      ),
      linear-gradient(
        to bottom,
        rgba(24, 25, 34, 0.3) 0%,
        transparent 30%,
        transparent 70%,
        rgba(24, 25, 34, 0.8) 100%
      );
    pointer-events: none;
  }

  .globe-hero__content {
    position: relative;
    z-index: 1;
    text-align: center;
    color: #fff;
    padding: 2.5em 3em;
    max-width: 700px;
    background: rgba(24, 25, 34, 0.75);
    border-radius: 8px;
    backdrop-filter: blur(8px);
  }

  .globe-hero__title {
    margin: 0 0 1.5em;
    font-weight: 400;
  }

  .globe-hero__title-main {
    display: block;
    font-size: 3em;
    font-weight: 400;
    line-height: 1.1;
    font-family:
      Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
      'Times New Roman', serif;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  }

  .globe-hero__title-part {
    display: block;
    font-family:
      Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
      'Times New Roman', serif;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 4px;
    text-indent: 4px;
    font-size: 0.85em;
    padding: 0.75em 0 0;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  }

  .globe-hero__title-part::before,
  .globe-hero__title-part::after {
    content: '\2014';
    padding: 0 0.5em;
    opacity: 0.6;
  }

  .globe-hero__description {
    font-size: 1.1em;
    line-height: 1.6;
    color: #e8e8e8;
    margin: 0 0 2.5em;
    font-family:
      'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .globe-hero__stats {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2em;
    margin-bottom: 3em;
  }

  .globe-hero__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25em;
  }

  .globe-hero__stat-value {
    font-size: 2.5em;
    font-weight: 300;
    font-family:
      Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
      'Times New Roman', serif;
    color: #47dbb4;
    line-height: 1;
  }

  .globe-hero__stat-label {
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #9d9c95;
    font-family:
      'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }

  .globe-hero__stat-divider {
    width: 1px;
    height: 40px;
    background: linear-gradient(
      to bottom,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
  }

  .globe-hero__scroll-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5em;
    color: #9d9c95;
    font-size: 0.8em;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-family:
      'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    animation: pulse 2s ease-in-out infinite;
  }

  .globe-hero__scroll-icon {
    animation: bounce 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(4px);
    }
  }

  @media (max-width: 720px) {
    .globe-hero {
      min-height: 500px;
    }

    .globe-hero__title-main {
      font-size: 2em;
    }

    .globe-hero__title-part {
      font-size: 0.7em;
      letter-spacing: 2px;
    }

    .globe-hero__description {
      font-size: 0.95em;
    }

    .globe-hero__stats {
      gap: 1.25em;
    }

    .globe-hero__stat-value {
      font-size: 1.75em;
    }

    .globe-hero__stat-label {
      font-size: 0.65em;
    }

    .globe-hero__stat-divider {
      height: 30px;
    }
  }
</style>
