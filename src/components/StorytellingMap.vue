<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'
  import { useScrollProgress } from '../composables/useScrollProgress'
  import { useD3Map } from '../composables/useD3Map'
  import { waypoints, storySections } from '../data/story'
  import HeroHeader from './HeroHeader.vue'
  import IntroQuote from './IntroQuote.vue'
  import StorySection from './StorySection.vue'
  import europeGeoJsonUrl from '../assets/europe.geojson?url'

  // Canvas reference
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const containerRef = ref<HTMLDivElement | null>(null)

  // Scroll progress tracking
  const { scrollProgress } = useScrollProgress(waypoints)

  // D3 Map with real geographic data
  useD3Map({
    geoJsonUrl: europeGeoJsonUrl,
    waypoints,
    scrollProgress,
    canvasRef,
  })

  // Canvas sizing
  const canvasWidth = ref(window.innerWidth)
  const canvasHeight = ref(window.innerHeight)

  const updateCanvasSize = () => {
    canvasWidth.value = window.innerWidth
    canvasHeight.value = window.innerHeight
  }

  onMounted(() => {
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateCanvasSize)
  })
</script>

<template>
  <div class="storytelling-map">
    <!-- Fixed Map Canvas (behind everything) -->
    <div ref="containerRef" class="map-container">
      <canvas
        ref="canvasRef"
        :width="canvasWidth"
        :height="canvasHeight"
        class="map-canvas"
      />
    </div>

    <!-- Hero Header -->
    <HeroHeader
      title="The European Trail"
      subtitle="From Lisbon to Paris"
      description="An interactive storytelling journey through Western Europe. Scroll to explore."
    />

    <!-- Intro Quote -->
    <IntroQuote
      quote="Twenty years from now you will be more disappointed by the things you didn't do than by the ones you did do."
      author="Mark Twain"
    />

    <!-- Story Content -->
    <div class="text">
      <StorySection
        v-for="(section, index) in storySections"
        :key="section.id"
        :section="section"
        :is-first="index === 0"
      />
    </div>

    <!-- Related/Footer -->
    <footer class="content--related">
      <p class="info">The journey has ended, but the memories live on.</p>
    </footer>
  </div>
</template>

<style scoped>
  .storytelling-map {
    position: relative;
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
    padding: 10em 2em;
    background: #181922;
    color: #fff;
  }

  .info {
    font-size: 1.65em;
    padding: 0 0 4em;
    font-family:
      Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
      'Times New Roman', serif;
    max-width: 800px;
    margin: 0 auto;
  }

  @media (max-width: 720px) {
    .text {
      padding: 2em;
      font-size: 0.85em;
      text-align: justify;
      background: rgba(255, 255, 255, 0.92);
    }
  }
</style>
