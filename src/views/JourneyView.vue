<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadJourney, loadJourneyStory } from '../services/journeyService'
import { useJourneyScrollProgress } from '../composables/useJourneyScrollProgress'
import { useJourneyMap } from '../composables/useJourneyMap'
import type { Journey, JourneyStory } from '../types'
import HeroHeader from '../components/HeroHeader.vue'
import StorySection from '../components/StorySection.vue'

const route = useRoute()
const router = useRouter()

const journey = ref<Journey | null>(null)
const story = ref<JourneyStory | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

// Canvas reference for the map
const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWidth = ref(window.innerWidth)
const canvasHeight = ref(window.innerHeight)

const slug = computed(() => route.params.slug as string)

// Extract waypoints and countries from journey for map
const waypoints = computed(() => journey.value?.waypoints || [])
const countries = computed(() => journey.value?.countries || [])

// Scroll progress tracking
const { scrollProgress, waypointsWithProgress } =
  useJourneyScrollProgress(waypoints)

// D3 Map rendering
useJourneyMap({
  waypoints: waypointsWithProgress,
  countries,
  scrollProgress,
  canvasRef,
})

// Convert story sections to StorySection format expected by component
const storySections = computed(() => {
  if (!story.value) return []

  return story.value.sections.map((section) => ({
    id: section.id,
    waypointId: section.waypointId,
    title: section.title,
    subtitle: section.subtitle,
    intro: undefined,
    blocks: section.blocks,
  }))
})

const updateCanvasSize = () => {
  canvasWidth.value = window.innerWidth
  canvasHeight.value = window.innerHeight
}

onMounted(async () => {
  updateCanvasSize()
  window.addEventListener('resize', updateCanvasSize)

  try {
    const [journeyData, storyData] = await Promise.all([
      loadJourney(slug.value),
      loadJourneyStory(slug.value),
    ])

    if (!journeyData) {
      error.value = 'Journey not found'
      return
    }

    journey.value = journeyData
    story.value = storyData
  } catch (e) {
    error.value = 'Failed to load journey'
    console.error(e)
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasSize)
})

function goBack() {
  router.push('/')
}
</script>

<template>
  <div class="journey-view">
    <!-- Loading state -->
    <div v-if="isLoading" class="journey-view__loading">
      <p>Loading journey...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="journey-view__error">
      <p>{{ error }}</p>
      <button @click="goBack">Back to Home</button>
    </div>

    <!-- Journey content with map -->
    <template v-else-if="journey">
      <!-- Fixed Map Canvas (behind everything) -->
      <div class="map-container">
        <canvas
          ref="canvasRef"
          :width="canvasWidth"
          :height="canvasHeight"
          class="map-canvas"
        />
      </div>

      <!-- Hero Header -->
      <HeroHeader
        :title="journey.title"
        :subtitle="journey.subtitle"
        :description="journey.description"
        :background-image="journey.heroImage"
      />

      <!-- Intro Quote / Journey Meta -->
      <section class="intro-section">
        <div class="intro-content">
          <p class="intro-quote">{{ journey.description }}</p>
          <div class="intro-meta">
            <span>{{ journey.duration }}</span>
            <span class="divider">•</span>
            <span>{{ journey.distance }}</span>
            <span class="divider">•</span>
            <span>{{ journey.countries.join(', ') }}</span>
          </div>
        </div>
      </section>

      <!-- Story Content (text on left with gradient) -->
      <div class="text">
        <StorySection
          v-for="(section, index) in storySections"
          :key="section.id"
          :section="section"
          :is-first="index === 0"
        />
      </div>

      <!-- Footer -->
      <footer class="content--related">
        <p class="info">
          The journey continues. Every road leads somewhere new.
        </p>
        <button class="back-btn" @click="goBack">Back to All Journeys</button>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.journey-view {
  position: relative;
}

.journey-view__loading,
.journey-view__error {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1em;
  font-family: 'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial,
    sans-serif;
  color: #5f646c;
}

.journey-view__error button {
  padding: 0.75em 1.5em;
  background: #181922;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
}

/* Map Container - Fixed behind content */
.map-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  z-index: -1;
}

.map-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* Intro Section */
.intro-section {
  position: relative;
  z-index: 1000;
  min-height: 50vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0.98) 0%,
    rgba(255, 255, 255, 0.95) 50%,
    rgba(255, 255, 255, 0.7) 75%,
    rgba(255, 255, 255, 0) 100%
  );
}

.intro-content {
  max-width: 600px;
  padding: 4em 3em;
  text-align: center;
}

.intro-quote {
  font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
    'Times New Roman', serif;
  font-size: 1.5em;
  line-height: 1.6;
  color: #5f646c;
  font-style: italic;
  margin: 0 0 1.5em;
}

.intro-meta {
  font-family: 'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial,
    sans-serif;
  font-size: 0.9em;
  color: #9d9c95;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.intro-meta .divider {
  margin: 0 0.75em;
}

/* Story Text Container - positioned on the left */
.text {
  position: relative;
  padding: 5em 3em;
  z-index: 1000;
  /* Subtle gradient fade to let map show through on the right */
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(255, 255, 255, 0.9) 60%,
    rgba(255, 255, 255, 0.5) 80%,
    rgba(255, 255, 255, 0) 100%
  );
}

/* Related/Footer */
.content--related {
  text-align: center;
  position: relative;
  z-index: 1000;
  padding: 6em 2em;
  background: #181922;
  color: #fff;
}

.info {
  font-size: 1.5em;
  padding: 0 0 2em;
  font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
    'Times New Roman', serif;
  max-width: 600px;
  margin: 0 auto;
  color: #d1d2d2;
}

.back-btn {
  padding: 1em 2em;
  background: transparent;
  color: #47dbb4;
  border: 1px solid #47dbb4;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial,
    sans-serif;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: #47dbb4;
  color: #181922;
}

@media (max-width: 720px) {
  .intro-section {
    min-height: auto;
    background: rgba(255, 255, 255, 0.95);
  }

  .intro-content {
    padding: 3em 1.5em;
  }

  .intro-quote {
    font-size: 1.2em;
  }

  .text {
    padding: 2em 1.5em;
    background: rgba(255, 255, 255, 0.95);
  }

  .content--related {
    padding: 4em 1.5em;
  }

  .info {
    font-size: 1.2em;
  }
}
</style>
