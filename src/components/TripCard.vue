<script setup lang="ts">
  import type { Trip } from '../types'

  defineProps<{
    trip: Trip
  }>()
</script>

<template>
  <article class="trip-card">
    <router-link :to="trip.route" class="trip-card__link">
      <figure class="trip-card__thumbnail">
        <img
          :src="trip.thumbnail"
          :alt="trip.title"
          class="trip-card__image"
          loading="lazy"
        />
        <div class="trip-card__overlay"></div>
      </figure>
      <div class="trip-card__content">
        <span class="trip-card__subtitle">{{ trip.subtitle }}</span>
        <h3 class="trip-card__title">{{ trip.title }}</h3>
        <p class="trip-card__description">{{ trip.description }}</p>
      </div>
    </router-link>
  </article>
</template>

<style scoped>
  .trip-card {
    position: relative;
    border-radius: 4px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 2px 8px rgba(24, 25, 34, 0.1);
    transition:
      transform 0.3s ease,
      box-shadow 0.3s ease;
  }

  .trip-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(24, 25, 34, 0.15);
  }

  .trip-card__link {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  .trip-card__thumbnail {
    position: relative;
    margin: 0;
    overflow: hidden;
    aspect-ratio: 16 / 10;
  }

  .trip-card__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }

  .trip-card:hover .trip-card__image {
    transform: scale(1.05);
  }

  .trip-card__overlay {
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

  .trip-card:hover .trip-card__overlay {
    background: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(71, 219, 180, 0.2) 100%
    );
  }

  .trip-card__content {
    padding: 1.5em;
  }

  .trip-card__subtitle {
    display: block;
    font-size: 0.75em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #cecec5;
    margin-bottom: 0.5em;
    font-family:
      'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }

  .trip-card__title {
    font-family:
      Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
      'Times New Roman', serif;
    font-size: 1.5em;
    font-weight: 400;
    color: #5f646c;
    margin: 0 0 0.5em;
    line-height: 1.2;
    transition: color 0.3s ease;
  }

  .trip-card:hover .trip-card__title {
    color: #47dbb4;
  }

  .trip-card__description {
    font-size: 0.9em;
    color: #9d9c95;
    line-height: 1.5;
    margin: 0;
    font-family:
      'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }

  @media (max-width: 720px) {
    .trip-card__content {
      padding: 1.25em;
    }

    .trip-card__title {
      font-size: 1.25em;
    }

    .trip-card__description {
      font-size: 0.85em;
    }
  }
</style>
