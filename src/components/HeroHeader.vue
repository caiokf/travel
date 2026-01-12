<script setup lang="ts">
  import { useRouter } from 'vue-router'

  const props = defineProps<{
    title: string
    subtitle: string
    description: string
    backgroundImage?: string
  }>()

  const router = useRouter()

  function goHome() {
    router.push('/')
  }
</script>

<template>
  <header
    class="hero-header"
    :style="props.backgroundImage ? { backgroundImage: `url(${props.backgroundImage})` } : {}"
  >
    <!-- Home navigation - frosted glass effect -->
    <button class="hero-header__home" @click="goHome">
      <svg class="hero-header__home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="hero-header__home-text">All Journeys</span>
    </button>

    <div class="hero-header__content">
      <h1 class="hero-header__title">
        <span class="hero-header__title-main">{{ title }}</span>
        <span class="hero-header__title-part">{{ subtitle }}</span>
        <span class="hero-header__title-sub">{{ description }}</span>
      </h1>
    </div>
  </header>
</template>

<style scoped>
  .hero-header {
    padding: 2em 1em 4em;
    text-align: center;
    height: 100vh;
    min-height: 600px;
    z-index: 1000;
    position: relative;
    color: #fff;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: #181922;
    background-repeat: no-repeat;
    background-position: center center;
    background-size: cover;
  }

  .hero-header::before {
    content: '';
    background: rgba(24, 25, 34, 0.5);
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  /* Frosted glass home button */
  .hero-header__home {
    position: absolute;
    top: 1.5em;
    left: 1.5em;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 0.4em;
    padding: 0.6em 1em 0.6em 0.7em;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 100px;
    color: #fff;
    font-family: 'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 0.8em;
    font-weight: 500;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .hero-header__home:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateX(-2px);
  }

  .hero-header__home-icon {
    width: 18px;
    height: 18px;
    transition: transform 0.3s ease;
  }

  .hero-header__home:hover .hero-header__home-icon {
    transform: translateX(-2px);
  }

  .hero-header__home-text {
    text-transform: uppercase;
    font-size: 0.85em;
  }

  .hero-header__content {
    position: relative;
    z-index: 1;
  }

  .hero-header__title {
    position: relative;
    margin: 0;
    font-weight: 400;
  }

  .hero-header__title-main {
    display: block;
    margin: 0 0 0.15em 0;
    font-size: 3em;
    font-weight: 400;
    line-height: 1;
    font-family:
      Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
      'Times New Roman', serif;
  }

  .hero-header__title-part {
    display: block;
    font-family:
      Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
      'Times New Roman', serif;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 4px;
    text-indent: 4px;
    font-size: 0.85em;
    padding: 0.5em 0 2em;
  }

  .hero-header__title-part::before,
  .hero-header__title-part::after {
    content: '\2014';
    padding: 0 0.5em;
  }

  .hero-header__title-sub {
    display: block;
    padding: 0.5em 0 1em;
    font-weight: 500;
    font-size: 0.55em;
    max-width: 700px;
    margin: 0 auto;
    color: #d1d2d2;
    font-family:
      'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }

  @media (max-width: 720px) {
    .hero-header__home {
      top: 1em;
      left: 1em;
      padding: 0.5em 0.8em 0.5em 0.6em;
      font-size: 0.75em;
    }

    .hero-header__home-icon {
      width: 16px;
      height: 16px;
    }

    .hero-header__title {
      font-size: 1.5em;
    }
  }
</style>
