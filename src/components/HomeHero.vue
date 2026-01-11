<script setup lang="ts">
  defineProps<{
    title: string
    subtitle: string
    description: string
    backgroundImage?: string
  }>()
</script>

<template>
  <header class="home-hero">
    <div class="home-hero__content">
      <h1 class="home-hero__title">
        <span class="home-hero__title-main">{{ title }}</span>
        <span class="home-hero__title-part">{{ subtitle }}</span>
        <span class="home-hero__title-sub">{{ description }}</span>
      </h1>
    </div>
  </header>
</template>

<style scoped>
  .home-hero {
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
    background: #181922 url('/img/hero.jpg') no-repeat center center;
    background-size: cover;
  }

  .home-hero::before {
    content: '';
    background: rgba(24, 25, 34, 0.5);
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  .home-hero__content {
    position: relative;
    z-index: 1;
  }

  .home-hero__title {
    position: relative;
    margin: 0;
    font-weight: 400;
  }

  .home-hero__title-main {
    display: block;
    margin: 0 0 0.15em 0;
    font-size: 3em;
    font-weight: 400;
    line-height: 1;
    font-family:
      Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
      'Times New Roman', serif;
  }

  .home-hero__title-part {
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

  .home-hero__title-part::before,
  .home-hero__title-part::after {
    content: '\2014';
    padding: 0 0.5em;
  }

  .home-hero__title-sub {
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
    .home-hero__title {
      font-size: 1.5em;
    }
  }
</style>
