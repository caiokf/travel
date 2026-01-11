<script setup lang="ts">
  import { computed } from 'vue'
  import type { Trip } from '../../types'
  import RoutePreview from './RoutePreview.vue'

  const props = defineProps<{
    trip: Trip
    isHovered: boolean
  }>()

  const emit = defineEmits<{
    hover: [isHovered: boolean]
  }>()

  // Build stats string using Trip interface properties
  const statsString = computed(() => {
    const parts: string[] = []
    if (props.trip.duration) {
      parts.push(props.trip.duration)
    }
    if (props.trip.cities) {
      parts.push(`${props.trip.cities} cities`)
    }
    if (props.trip.distance) {
      parts.push(props.trip.distance)
    }
    return parts.join(' · ')
  })

  // Check if we have coordinates for the route preview
  const hasCoordinates = computed(() => {
    return props.trip.coordinates && props.trip.coordinates.length >= 2
  })

  function handleMouseEnter() {
    emit('hover', true)
  }

  function handleMouseLeave() {
    emit('hover', false)
  }
</script>

<template>
  <article
    class="journey-card"
    :class="{ 'journey-card--hovered': isHovered }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <router-link :to="trip.route" class="journey-card__link">
      <figure class="journey-card__thumbnail">
        <img
          :src="trip.thumbnail"
          :alt="trip.title"
          class="journey-card__image"
          loading="lazy"
        />
        <div class="journey-card__overlay"></div>
      </figure>

      <div class="journey-card__content">
        <div class="journey-card__header">
          <div class="journey-card__titles">
            <span class="journey-card__subtitle">{{ trip.subtitle }}</span>
            <h3 class="journey-card__title">{{ trip.title }}</h3>
          </div>

          <RoutePreview
            v-if="hasCoordinates"
            :coordinates="trip.coordinates!"
            class="journey-card__route"
          />
        </div>

        <p class="journey-card__description">{{ trip.description }}</p>

        <!-- Stats row -->
        <div v-if="statsString" class="journey-card__stats">
          {{ statsString }}
        </div>

        <!-- Country tags -->
        <div v-if="trip.countries?.length" class="journey-card__countries">
          <span
            v-for="country in trip.countries"
            :key="country"
            class="journey-card__country-tag"
          >
            {{ country }}
          </span>
        </div>

        <!-- Date range -->
        <div v-if="trip.dateRange" class="journey-card__date">
          {{ trip.dateRange }}
        </div>
      </div>
    </router-link>
  </article>
</template>

<style scoped>
  .journey-card {
    position: relative;
    border-radius: 4px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 2px 8px rgba(24, 25, 34, 0.1);
    transition:
      transform 0.3s ease,
      box-shadow 0.3s ease;
  }

  .journey-card:hover,
  .journey-card--hovered {
    transform: translateY(-4px);
    box-shadow:
      0 8px 24px rgba(24, 25, 34, 0.15),
      0 0 0 1px rgba(199, 80, 80, 0.1);
  }

  .journey-card__link {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  .journey-card__thumbnail {
    position: relative;
    margin: 0;
    overflow: hidden;
    aspect-ratio: 21 / 9;
  }

  .journey-card__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }

  .journey-card:hover .journey-card__image,
  .journey-card--hovered .journey-card__image {
    transform: scale(1.05);
  }

  .journey-card__overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(24, 25, 34, 0.1) 100%
    );
    transition: background 0.3s ease;
  }

  .journey-card:hover .journey-card__overlay,
  .journey-card--hovered .journey-card__overlay {
    background: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(71, 219, 180, 0.2) 100%
    );
  }

  .journey-card__content {
    padding: 1em 1.25em;
  }

  .journey-card__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75em;
    margin-bottom: 0.5em;
  }

  .journey-card__titles {
    flex: 1;
    min-width: 0;
  }

  .journey-card__subtitle {
    display: block;
    font-size: 0.65em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #cecec5;
    margin-bottom: 0.25em;
    font-family:
      'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }

  .journey-card__title {
    font-family:
      Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
      'Times New Roman', serif;
    font-size: 1.2em;
    font-weight: 400;
    color: #5f646c;
    margin: 0;
    line-height: 1.2;
    transition: color 0.3s ease;
  }

  .journey-card:hover .journey-card__title,
  .journey-card--hovered .journey-card__title {
    color: #47dbb4;
  }

  .journey-card__route {
    flex-shrink: 0;
    opacity: 0.7;
    transition: opacity 0.3s ease;
  }

  .journey-card:hover .journey-card__route,
  .journey-card--hovered .journey-card__route {
    opacity: 1;
  }

  .journey-card__description {
    font-size: 0.8em;
    color: #9d9c95;
    line-height: 1.4;
    margin: 0 0 0.5em;
    font-family:
      'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }

  .journey-card__stats {
    font-size: 0.7em;
    font-weight: 500;
    color: #5f646c;
    margin-bottom: 0.5em;
    font-family:
      'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    letter-spacing: 0.5px;
  }

  .journey-card__countries {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35em;
    margin-bottom: 0.5em;
  }

  .journey-card__country-tag {
    display: inline-block;
    padding: 0.2em 0.5em;
    font-size: 0.6em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #5f646c;
    background: #f8f9fa;
    border-radius: 2px;
    font-family:
      'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }

  .journey-card__date {
    font-size: 0.65em;
    color: #cecec5;
    font-family:
      'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }

  @media (max-width: 720px) {
    .journey-card__content {
      padding: 1em;
    }

    .journey-card__header {
      flex-direction: column;
      gap: 0.5em;
    }

    .journey-card__title {
      font-size: 1.1em;
    }

    .journey-card__description {
      font-size: 0.75em;
    }

    .journey-card__route {
      align-self: flex-start;
    }
  }
</style>
