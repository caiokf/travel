<script setup lang="ts">
  import { computed, ref, onMounted, onUnmounted } from 'vue'
  import type { Trip } from '../../types'

  const props = defineProps<{
    trips: Trip[]
  }>()

  const emit = defineEmits<{
    'journey-hover': [tripId: string | null]
  }>()

  const activeYear = ref<number | null>(null)
  const yearRefs = ref<Map<number, HTMLElement>>(new Map())

  // Sort trips by date (newest first)
  const sortedTrips = computed(() => {
    return [...props.trips].sort((a, b) => {
      const yearA = a.year || 2024
      const yearB = b.year || 2024
      if (yearB !== yearA) return yearB - yearA
      const monthA = a.month || 1
      const monthB = b.month || 1
      return monthB - monthA
    })
  })

  // Group by year for display
  const tripsByYear = computed(() => {
    const grouped = new Map<number, Trip[]>()
    sortedTrips.value.forEach((trip) => {
      const year = trip.year || 2024
      if (!grouped.has(year)) {
        grouped.set(year, [])
      }
      grouped.get(year)!.push(trip)
    })
    return grouped
  })

  // Get unique years
  const years = computed(() => {
    return Array.from(tripsByYear.value.keys()).sort((a, b) => b - a)
  })

  // Track hovered trip for globe interaction
  function handleCardHover(tripId: string | null) {
    emit('journey-hover', tripId)
  }

  // Track failed images
  const failedImages = ref<Set<string>>(new Set())

  function handleImageError(tripId: string) {
    failedImages.value.add(tripId)
  }

  function setYearRef(year: number, el: HTMLElement | null) {
    if (el) {
      yearRefs.value.set(year, el)
    }
  }

  // Scroll to a specific year
  function scrollToYear(year: number) {
    const el = yearRefs.value.get(year)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Update active year based on scroll position
  function handleScroll() {
    const scrollY = window.scrollY + 200

    for (const [year, el] of yearRefs.value.entries()) {
      const rect = el.getBoundingClientRect()
      const top = rect.top + window.scrollY

      if (scrollY >= top) {
        activeYear.value = year
      }
    }
  }

  onMounted(() => {
    if (years.value.length > 0) {
      activeYear.value = years.value[0]
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })
</script>

<template>
  <section class="journey-timeline">
    <!-- Sticky year navigation -->
    <nav class="journey-timeline__years">
      <button
        v-for="year in years"
        :key="year"
        class="journey-timeline__year-btn"
        :class="{ 'journey-timeline__year-btn--active': activeYear === year }"
        @click="scrollToYear(year)"
      >
        {{ year }}
      </button>
    </nav>

    <!-- Journey cards -->
    <div class="journey-timeline__content">
      <div
        v-for="year in years"
        :key="year"
        :ref="(el) => setYearRef(year, el as HTMLElement)"
        class="journey-timeline__year-section"
      >
        <h2 class="journey-timeline__year-title">{{ year }}</h2>

        <div class="journey-timeline__cards">
          <article
            v-for="trip in tripsByYear.get(year)"
            :key="trip.id"
            class="journey-card"
            @mouseenter="handleCardHover(trip.id)"
            @mouseleave="handleCardHover(null)"
          >
            <router-link :to="trip.route" class="journey-card__link">
              <div class="journey-card__image-container">
                <img
                  v-if="!failedImages.has(trip.id)"
                  :src="trip.thumbnail"
                  :alt="trip.title"
                  class="journey-card__image"
                  loading="lazy"
                  @error="handleImageError(trip.id)"
                />
                <div class="journey-card__placeholder" v-else></div>
                <div class="journey-card__gradient"></div>
              </div>

              <div class="journey-card__content">
                <div class="journey-card__meta">
                  <span class="journey-card__date">{{ trip.dateRange }}</span>
                  <span v-if="trip.duration" class="journey-card__duration">{{ trip.duration }}</span>
                </div>

                <h3 class="journey-card__title">{{ trip.title }}</h3>

                <p class="journey-card__subtitle">{{ trip.subtitle }}</p>

                <div v-if="trip.countries?.length" class="journey-card__countries">
                  {{ trip.countries.join(' → ') }}
                </div>
              </div>
            </router-link>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
  .journey-timeline {
    position: relative;
    padding: 0 0 6em;
    background: linear-gradient(
      to bottom,
      #181922 0%,
      #1e2530 10%,
      #252d3a 30%,
      #2d3748 100%
    );
    min-height: 100vh;
  }

  /* Sticky year navigation */
  .journey-timeline__years {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    justify-content: center;
    gap: 2em;
    padding: 1.5em 2em;
    background: rgba(24, 25, 34, 0.9);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .journey-timeline__year-btn {
    background: none;
    border: none;
    font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif;
    font-size: 1.1em;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    padding: 0.5em 0;
    position: relative;
    transition: color 0.3s ease;
  }

  .journey-timeline__year-btn:hover {
    color: rgba(255, 255, 255, 0.7);
  }

  .journey-timeline__year-btn--active {
    color: #fff;
  }

  .journey-timeline__year-btn--active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 2px;
    background: #c75050;
  }

  /* Content area */
  .journey-timeline__content {
    max-width: 700px;
    margin: 0 auto;
    padding: 4em 2em;
  }

  /* Year sections */
  .journey-timeline__year-section {
    margin-bottom: 5em;
  }

  .journey-timeline__year-section:last-child {
    margin-bottom: 0;
  }

  .journey-timeline__year-title {
    font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif;
    font-size: 3em;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.15);
    margin: 0 0 1em;
    padding-left: 0.25em;
  }

  /* Cards */
  .journey-timeline__cards {
    display: flex;
    flex-direction: column;
    gap: 3em;
  }

  /* Journey Card */
  .journey-card {
    border-radius: 12px;
    overflow: hidden;
    background: #181922;
    transition: transform 0.4s ease, box-shadow 0.4s ease;
  }

  .journey-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }

  .journey-card__link {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  .journey-card__image-container {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
  }

  .journey-card__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s ease;
  }

  .journey-card:hover .journey-card__image {
    transform: scale(1.05);
  }

  .journey-card__placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(
      135deg,
      #2d3748 0%,
      #1e2530 50%,
      #2d3748 100%
    );
  }

  .journey-card__gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgba(24, 25, 34, 1) 0%,
      rgba(24, 25, 34, 0.6) 40%,
      transparent 100%
    );
  }

  .journey-card__content {
    padding: 1.5em 2em 2em;
    margin-top: -5em;
    position: relative;
    z-index: 1;
  }

  .journey-card__meta {
    display: flex;
    gap: 1.5em;
    margin-bottom: 0.75em;
    font-family: 'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.5);
  }

  .journey-card__title {
    font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif;
    font-size: 1.75em;
    font-weight: 400;
    color: #fff;
    margin: 0 0 0.25em;
    line-height: 1.2;
    transition: color 0.3s ease;
  }

  .journey-card:hover .journey-card__title {
    color: #47dbb4;
  }

  .journey-card__subtitle {
    font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif;
    font-size: 1.05em;
    font-style: italic;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 1em;
    line-height: 1.4;
  }

  .journey-card__countries {
    font-family: 'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 0.8em;
    color: #c75050;
    letter-spacing: 0.5px;
  }

  /* Mobile adjustments */
  @media (max-width: 720px) {
    .journey-timeline__years {
      gap: 1.25em;
      padding: 1em 1.5em;
      overflow-x: auto;
      justify-content: flex-start;
      scrollbar-width: none;
    }

    .journey-timeline__years::-webkit-scrollbar {
      display: none;
    }

    .journey-timeline__year-btn {
      font-size: 1em;
      flex-shrink: 0;
    }

    .journey-timeline__content {
      padding: 2em 1em;
    }

    .journey-timeline__year-title {
      font-size: 2.25em;
      margin-bottom: 0.75em;
    }

    .journey-timeline__year-section {
      margin-bottom: 3em;
    }

    .journey-timeline__cards {
      gap: 2em;
    }

    .journey-card__content {
      padding: 1.25em 1.5em 1.5em;
      margin-top: -4em;
    }

    .journey-card__title {
      font-size: 1.4em;
    }

    .journey-card__subtitle {
      font-size: 0.95em;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .journey-card,
    .journey-card__image {
      transition: none;
    }
  }
</style>
