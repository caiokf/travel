<script setup lang="ts">
  import type { StorySection } from '../../types'

  defineProps<{
    section: StorySection
    isFirst: boolean
  }>()
</script>

<template>
  <section class="story-section" :data-waypoint-id="section.waypointId">
    <h2 v-if="section.title">
      <span class="title-up">{{ section.title }}</span>
      <span class="title-down">{{ section.subtitle }}</span>
    </h2>

    <p v-if="section.intro" class="text-intro">{{ section.intro }}</p>

    <template v-for="(block, index) in section.blocks" :key="index">
      <p v-if="block.type === 'paragraph'">{{ block.content }}</p>

      <figure v-else-if="block.type === 'image'">
        <img :src="block.src" :alt="block.caption || ''" />
        <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
      </figure>

      <blockquote v-else-if="block.type === 'quote'">
        <em>{{ block.content }}</em>
        <span v-if="block.author"> &mdash; {{ block.author }}</span>
      </blockquote>
    </template>
  </section>
</template>

<style scoped>
  .story-section {
    width: 50%;
    max-width: 700px;
    font-size: 1.25em;
    line-height: 1.7;
  }

  .story-section h2 {
    font-weight: 400;
    font-size: 2.7em;
    margin: 0;
    text-align: left;
    padding: 2em 0 0 0;
  }

  .story-section:first-child h2 {
    padding-top: 0;
  }

  .title-up {
    text-transform: uppercase;
    display: block;
    font-size: 0.365em;
    font-weight: bold;
    letter-spacing: 7px;
    color: #cecec5;
    font-family:
      'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }

  .title-down {
    font-weight: 400;
    color: #5f646c;
    font-size: 1.35em;
    line-height: 0.9;
    padding: 0.15em 0 0.35em;
    display: block;
    font-family:
      Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
      'Times New Roman', serif;
  }

  .story-section p {
    font-size: 0.95em;
    margin: 0.5em 0 1.5em;
  }

  .story-section .text-intro {
    margin: 0.5em 0 1.25em;
    font-style: italic;
    font-size: 1.3em;
    color: #9d9c95;
    text-align: left;
    line-height: 1.5;
  }

  .story-section figure {
    margin: 1em 0 2em;
  }

  .story-section figure img {
    max-width: 100%;
    display: block;
  }

  .story-section figcaption {
    font-style: italic;
    font-size: 0.85em;
    text-align: center;
    padding: 1em 1.5em 0;
    color: #5f646c;
  }

  .story-section blockquote {
    font-family:
      Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
      'Times New Roman', serif;
    font-size: 2em;
    line-height: 1.5;
    position: relative;
    color: #939997;
    text-align: left;
    margin: 1em 0;
    padding: 0;
  }

  .story-section blockquote::before {
    content: '\201C';
    position: absolute;
    right: 100%;
    font-size: 2.5em;
    font-style: italic;
    top: -0.15em;
    color: #f0f3f3;
    margin: 0 0.075em 0 0;
    line-height: 1;
  }

  .story-section blockquote em {
    font-style: italic;
  }

  .story-section blockquote span {
    font-size: 0.5em;
    color: #cbcece;
    white-space: nowrap;
    font-family:
      'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }

  @media (max-width: 720px) {
    .story-section {
      width: 100%;
      max-width: none;
    }

    .story-section h2 {
      font-size: 1.85em;
    }

    .story-section blockquote {
      font-size: 1.45em;
    }
  }
</style>
