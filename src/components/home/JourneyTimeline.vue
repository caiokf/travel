<script setup lang="ts">
  import { computed, ref, onMounted, onUnmounted } from 'vue'
  import type { Trip } from '../../types'
  import JourneyCard from './JourneyCard.vue'

  const props = defineProps<{
    trips: Trip[]
  }>()

  const emit = defineEmits<{
    'journey-hover': [tripId: string | null]
  }>()

  // Track which cards are visible for scroll animation
  const visibleCards = ref<Set<string>>(new Set())
  const cardRefs = ref<Map<string, HTMLElement>>(new Map())

  // Group trips by year
  const tripsByYear = computed(() => {
    const grouped = new Map<number, Trip[]>()

    // Sort trips by year (newest first)
    const sortedTrips = [...props.trips].sort((a, b) => {
      const yearA = a.year || 2024
      const yearB = b.year || 2024
      return yearB - yearA
    })

    sortedTrips.forEach((trip) => {
      const year = trip.year || 2024
      if (!grouped.has(year)) {
        grouped.set(year, [])
      }
      grouped.get(year)!.push(trip)
    })

    return grouped
  })

  // Get sorted years
  const sortedYears = computed(() => {
    return Array.from(tripsByYear.value.keys()).sort((a, b) => b - a)
  })

  // Track hovered trip
  const hoveredTripId = ref<string | null>(null)

  function handleCardHover(tripId: string, isHovered: boolean) {
    hoveredTripId.value = isHovered ? tripId : null
    emit('journey-hover', hoveredTripId.value)
  }

  // Intersection Observer for scroll animations
  let observer: IntersectionObserver | null = null

  function setCardRef(tripId: string, el: HTMLElement | null) {
    if (el) {
      cardRefs.value.set(tripId, el)
      if (observer) {
        observer.observe(el)
      }
    }
  }

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const tripId = entry.target.getAttribute('data-trip-id')
          if (tripId && entry.isIntersecting) {
            visibleCards.value.add(tripId)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    )

    // Observe all existing cards
    cardRefs.value.forEach((el) => {
      observer!.observe(el)
    })
  })

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  })
</script>

<template>
  <section class="journey-timeline">
    <div class="journey-timeline__container">
      <!-- Timeline spine -->
      <div class="journey-timeline__spine"></div>

      <!-- Year groups -->
      <div
        v-for="year in sortedYears"
        :key="year"
        class="journey-timeline__year-group"
      >
        <!-- Year marker -->
        <div class="journey-timeline__year-marker">
          <span class="journey-timeline__year">{{ year }}</span>
          <div class="journey-timeline__year-dot"></div>
        </div>

        <!-- Cards for this year -->
        <div class="journey-timeline__cards">
          <div
            v-for="trip in tripsByYear.get(year)"
            :key="trip.id"
            :ref="(el) => setCardRef(trip.id, el as HTMLElement)"
            :data-trip-id="trip.id"
            class="journey-timeline__card-wrapper"
            :class="{
              'journey-timeline__card-wrapper--visible': visibleCards.has(
                trip.id
              ),
            }"
          >
            <!-- Connector line -->
            <div class="journey-timeline__connector"></div>

            <JourneyCard
              :trip="trip"
              :is-hovered="hoveredTripId === trip.id"
              @hover="(isHovered) => handleCardHover(trip.id, isHovered)"
            />
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <p v-if="trips.length === 0" class="journey-timeline__empty">
        No journeys available at the moment.
      </p>
    </div>
  </section>
</template>

<style scoped>
  .journey-timeline {
    width: 100%;
    padding: 4em 2em;
    background: #f8f9fa;
  }

  .journey-timeline__container {
    max-width: 900px;
    margin: 0 auto;
    position: relative;
    padding-left: 120px;
  }

  /* Vertical spine line */
  .journey-timeline__spine {
    position: absolute;
    left: 100px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      #c75050 5%,
      #c75050 95%,
      transparent 100%
    );
  }

  /* Year group */
  .journey-timeline__year-group {
    position: relative;
    margin-bottom: 3em;
  }

  .journey-timeline__year-group:last-child {
    margin-bottom: 0;
  }

  /* Year marker */
  .journey-timeline__year-marker {
    position: absolute;
    left: -120px;
    top: 0;
    width: 100px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
  }

  .journey-timeline__year {
    font-family:
      Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
      'Times New Roman', serif;
    font-size: 1.75em;
    font-weight: 400;
    color: #5f646c;
    line-height: 1;
  }

  .journey-timeline__year-dot {
    width: 12px;
    height: 12px;
    background: #c75050;
    border-radius: 50%;
    border: 3px solid #f8f9fa;
    box-shadow: 0 0 0 2px #c75050;
    position: relative;
    right: -7px;
  }

  /* Cards container */
  .journey-timeline__cards {
    display: flex;
    flex-direction: column;
    gap: 2em;
    padding-left: 2em;
  }

  /* Card wrapper with connector */
  .journey-timeline__card-wrapper {
    position: relative;
    opacity: 0;
    transform: translateX(20px);
    transition:
      opacity 0.6s ease,
      transform 0.6s ease;
  }

  .journey-timeline__card-wrapper--visible {
    opacity: 1;
    transform: translateX(0);
  }

  /* Connector line from spine to card */
  .journey-timeline__connector {
    position: absolute;
    left: -2em;
    top: 50%;
    width: 2em;
    height: 2px;
    background: #c75050;
    opacity: 0.4;
  }

  .journey-timeline__connector::before {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 6px;
    height: 6px;
    background: #c75050;
    border-radius: 50%;
  }

  /* Empty state */
  .journey-timeline__empty {
    text-align: center;
    font-size: 1.1em;
    color: #9d9c95;
    font-family:
      'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    padding: 3em 0;
  }

  /* Mobile responsive */
  @media (max-width: 720px) {
    .journey-timeline {
      padding: 2em 1em;
    }

    .journey-timeline__container {
      padding-left: 0;
    }

    /* Hide spine on mobile */
    .journey-timeline__spine {
      display: none;
    }

    /* Year marker becomes inline header */
    .journey-timeline__year-group {
      margin-bottom: 2em;
    }

    .journey-timeline__year-marker {
      position: relative;
      left: 0;
      width: auto;
      justify-content: flex-start;
      margin-bottom: 1em;
      padding-bottom: 0.75em;
      border-bottom: 2px solid #c75050;
    }

    .journey-timeline__year {
      font-size: 1.5em;
    }

    .journey-timeline__year-dot {
      display: none;
    }

    .journey-timeline__cards {
      padding-left: 0;
      gap: 1.5em;
    }

    .journey-timeline__connector {
      display: none;
    }

    .journey-timeline__card-wrapper {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
