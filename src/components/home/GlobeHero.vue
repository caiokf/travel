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

    <div class="hero__title-container">
      <h1 class="hero__title">The Long Way Home</h1>
      <p class="hero__tagline">with some stories along the way</p>
    </div>

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
        rgba(0, 0, 0, 0.5) 0%,
        rgba(0, 0, 0, 0.25) 20%,
        transparent 40%,
        transparent 75%,
        rgba(248, 246, 243, 0.7) 88%,
        #f8f6f3 100%
      );
    pointer-events: none;
  }

  .hero__title-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1;
    text-align: center;
    padding: 0.8em 2em;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .hero__title {
    font-family:
      Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
      'Times New Roman', serif;
    font-size: 2em;
    font-weight: 400;
    color: #ffffff;
    margin: 0;
    letter-spacing: 0.04em;
    text-shadow:
      0 4px 40px rgba(0, 0, 0, 1),
      0 2px 15px rgba(0, 0, 0, 0.9),
      0 8px 60px rgba(0, 0, 0, 0.8);
    -webkit-text-stroke: 1.5px rgba(30, 20, 10, 1);
    paint-order: stroke fill;
  }

  .hero__tagline {
    font-family:
      Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
      'Times New Roman', serif;
    font-size: 1.2em;
    font-weight: 400;
    font-style: italic;
    color: #ffffff;
    margin: 0;
    letter-spacing: 0.02em;
    text-shadow:
      0 4px 40px rgba(0, 0, 0, 1),
      0 2px 15px rgba(0, 0, 0, 1),
      0 8px 60px rgba(0, 0, 0, 1),
      0 0 80px rgba(0, 0, 0, 1),
      0 0 120px rgba(0, 0, 0, 0.8);
    -webkit-text-stroke: 1px rgba(30, 20, 10, 1);
    paint-order: stroke fill;
  }

  .hero__scroll {
    position: absolute;
    bottom: 4em;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    color: #ffffff;
    animation: bounce 2s ease-in-out infinite;
    z-index: 1;
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

    .hero__title-container {
      padding: 0.6em 1em;
    }

    .hero__title {
      font-size: 1.5em;
    }

    .hero__tagline {
      font-size: 0.95em;
    }

    .hero__scroll {
      bottom: 3em;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero__scroll {
      animation: none;
    }
  }
</style>
