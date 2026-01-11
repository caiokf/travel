<script setup lang="ts">
  import HomeHero from '../components/HomeHero.vue'
  import TripGrid from '../components/TripGrid.vue'
  import { trips } from '../data/trips'
</script>

<template>
  <div class="home-page">
    <!-- Hero Header -->
    <HomeHero
      title="Travel Journeys"
      subtitle="Stories from the Road"
      description="Explore interactive storytelling journeys through beautiful destinations. Scroll through maps, discover stories, and experience travel adventures."
    />

    <!-- Trip Grid -->
    <main class="home-page__content">
      <TripGrid :trips="trips" />
    </main>

    <!-- Footer -->
    <footer class="home-page__footer">
      <p class="home-page__footer-text">More journeys coming soon.</p>
    </footer>
  </div>
</template>

<style scoped>
  .home-page {
    position: relative;
  }

  .home-page__content {
    position: relative;
    z-index: 1;
  }

  .home-page__footer {
    text-align: center;
    position: relative;
    z-index: 1000;
    padding: 4em 2em;
    background: #181922;
    color: #fff;
  }

  .home-page__footer-text {
    font-size: 1.25em;
    font-family:
      Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
      'Times New Roman', serif;
    max-width: 800px;
    margin: 0 auto;
    color: #d1d2d2;
  }

  @media (max-width: 720px) {
    .home-page__footer {
      padding: 3em 1.5em;
    }

    .home-page__footer-text {
      font-size: 1.1em;
    }
  }
</style>
