<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import type { Trip } from '../../types'

  defineProps<{
    trips: Trip[]
    focusedTripId: string | null
  }>()

  const isLoaded = ref(false)

  onMounted(() => {
    const img = new Image()
    img.onload = () => {
      isLoaded.value = true
    }
    img.src = '/images/hero-image.webp'
  })
</script>

<template>
  <header class="hero" :class="{ 'hero--loaded': isLoaded }">
    <div class="hero__image-container">
      <img
        src="/images/hero-image.webp"
        alt="Travel journey"
        class="hero__image"
      />
      <div class="hero__gradient"></div>
    </div>

    <div class="hero__content">
      <h1 class="hero__title">Travel Journeys</h1>

      <div class="hero__scroll">
        <svg
          class="hero__scroll-icon"
          width="20"
          height="20"
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
  .hero {
    position: relative;
    height: 100vh;
    min-height: 500px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
    background: #f8f6f3;
  }

  .hero__image-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  .hero__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    opacity: 0;
    transition: opacity 1.2s ease;
  }

  .hero--loaded .hero__image {
    opacity: 1;
  }

  .hero__gradient {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background:
      linear-gradient(
        to bottom,
        transparent 0%,
        transparent 75%,
        rgba(248, 246, 243, 0.7) 88%,
        #f8f6f3 100%
      );
    pointer-events: none;
  }

  .hero__content {
    position: relative;
    z-index: 1;
    text-align: center;
    padding: 0 2em 4em;
    width: 100%;
  }

  .hero__title {
    font-family:
      Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
      'Times New Roman', serif;
    font-size: 3.5em;
    font-weight: 400;
    color: #2d261e;
    margin: 0 0 1.5em;
    letter-spacing: 0.02em;
  }

  .hero__scroll {
    display: flex;
    justify-content: center;
    color: #5c4d3d;
    animation: bounce 2s ease-in-out infinite;
  }

  .hero__scroll-icon {
    opacity: 0.8;
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(6px);
    }
  }

  @media (max-width: 720px) {
    .hero {
      min-height: 400px;
    }

    .hero__content {
      padding: 0 1.5em 3em;
    }

    .hero__title {
      font-size: 2.25em;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero__scroll {
      animation: none;
    }
  }
</style>
