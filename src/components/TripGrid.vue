<script setup lang="ts">
  import type { Trip } from '../types'
  import TripCard from './TripCard.vue'

  defineProps<{
    trips: Trip[]
  }>()
</script>

<template>
  <section class="trip-grid">
    <div class="trip-grid__container">
      <TripCard v-for="trip in trips" :key="trip.id" :trip="trip" />
    </div>
    <p v-if="trips.length === 0" class="trip-grid__empty">
      No journeys available at the moment.
    </p>
  </section>
</template>

<style scoped>
  .trip-grid {
    width: 100%;
    padding: 4em 2em;
    background: #f8f9fa;
  }

  .trip-grid__container {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 2em;
  }

  .trip-grid__empty {
    text-align: center;
    font-size: 1.1em;
    color: #9d9c95;
    font-family:
      'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    padding: 3em 0;
  }

  @media (max-width: 720px) {
    .trip-grid {
      padding: 2em 1em;
    }

    .trip-grid__container {
      grid-template-columns: 1fr;
      gap: 1.5em;
    }
  }
</style>
