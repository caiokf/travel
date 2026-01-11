<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadJourney, loadJourneyStory } from '../services/journeyService'
import type { Journey, JourneyStory, ContentBlock } from '../types'
import HeroHeader from '../components/HeroHeader.vue'

const route = useRoute()
const router = useRouter()

const journey = ref<Journey | null>(null)
const story = ref<JourneyStory | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

const slug = computed(() => route.params.slug as string)

onMounted(async () => {
  try {
    const [journeyData, storyData] = await Promise.all([
      loadJourney(slug.value),
      loadJourneyStory(slug.value),
    ])

    if (!journeyData) {
      error.value = 'Journey not found'
      return
    }

    journey.value = journeyData
    story.value = storyData
  } catch (e) {
    error.value = 'Failed to load journey'
    console.error(e)
  } finally {
    isLoading.value = false
  }
})

function goBack() {
  router.push('/')
}

function renderBlock(block: ContentBlock): string {
  switch (block.type) {
    case 'paragraph':
      return `<p>${block.content}</p>`
    case 'quote':
      return `<blockquote><p>${block.content}</p>${block.author ? `<cite>— ${block.author}</cite>` : ''}</blockquote>`
    case 'image':
      return `<figure><img src="${block.src}" alt="${block.caption || ''}" />${block.caption ? `<figcaption>${block.caption}</figcaption>` : ''}</figure>`
    case 'heading':
      return `<h${block.level || 3}>${block.content}</h${block.level || 3}>`
    case 'divider':
      return '<hr />'
    default:
      return ''
  }
}
</script>

<template>
  <div class="journey-view">
    <!-- Loading state -->
    <div v-if="isLoading" class="journey-view__loading">
      <p>Loading journey...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="journey-view__error">
      <p>{{ error }}</p>
      <button @click="goBack">Back to Home</button>
    </div>

    <!-- Journey content -->
    <template v-else-if="journey">
      <!-- Hero -->
      <HeroHeader
        :title="journey.title"
        :subtitle="journey.subtitle"
        :description="journey.description"
        :background-image="journey.heroImage"
      />

      <!-- Journey meta -->
      <div class="journey-view__meta">
        <div class="journey-view__meta-item">
          <span class="journey-view__meta-label">Duration</span>
          <span class="journey-view__meta-value">{{ journey.duration }}</span>
        </div>
        <div class="journey-view__meta-item">
          <span class="journey-view__meta-label">Distance</span>
          <span class="journey-view__meta-value">{{ journey.distance }}</span>
        </div>
        <div class="journey-view__meta-item">
          <span class="journey-view__meta-label">Countries</span>
          <span class="journey-view__meta-value">{{
            journey.countries.join(', ')
          }}</span>
        </div>
        <div class="journey-view__meta-item">
          <span class="journey-view__meta-label">Date</span>
          <span class="journey-view__meta-value">{{ journey.dateRange }}</span>
        </div>
      </div>

      <!-- Story sections -->
      <div class="journey-view__content">
        <article
          v-for="section in story?.sections"
          :key="section.id"
          class="journey-view__section"
        >
          <header class="journey-view__section-header">
            <h2 v-if="section.title" class="journey-view__section-title">
              {{ section.title }}
            </h2>
            <p v-if="section.subtitle" class="journey-view__section-subtitle">
              {{ section.subtitle }}
            </p>
          </header>

          <div
            class="journey-view__section-content"
            v-html="section.blocks.map(renderBlock).join('')"
          ></div>
        </article>
      </div>

      <!-- Footer -->
      <footer class="journey-view__footer">
        <p class="journey-view__footer-text">
          The journey continues. Every road leads somewhere new.
        </p>
        <button class="journey-view__back-btn" @click="goBack">
          Back to All Journeys
        </button>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.journey-view {
  position: relative;
}

.journey-view__loading,
.journey-view__error {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1em;
  font-family: 'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial,
    sans-serif;
  color: #5f646c;
}

.journey-view__error button {
  padding: 0.75em 1.5em;
  background: #181922;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
}

.journey-view__meta {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2em;
  padding: 3em 2em;
  background: #f8f9fa;
  border-bottom: 1px solid #e8e8e8;
}

.journey-view__meta-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25em;
}

.journey-view__meta-label {
  font-size: 0.7em;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #9d9c95;
  font-family: 'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial,
    sans-serif;
}

.journey-view__meta-value {
  font-size: 1.1em;
  color: #5f646c;
  font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
    'Times New Roman', serif;
}

.journey-view__content {
  max-width: 800px;
  margin: 0 auto;
  padding: 4em 2em;
}

.journey-view__section {
  margin-bottom: 4em;
}

.journey-view__section:last-child {
  margin-bottom: 0;
}

.journey-view__section-header {
  margin-bottom: 2em;
  text-align: center;
}

.journey-view__section-title {
  font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
    'Times New Roman', serif;
  font-size: 2em;
  font-weight: 400;
  color: #181922;
  margin: 0 0 0.25em;
}

.journey-view__section-subtitle {
  font-family: 'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial,
    sans-serif;
  font-size: 1em;
  color: #9d9c95;
  margin: 0;
  font-style: italic;
}

.journey-view__section-content {
  font-family: 'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial,
    sans-serif;
  font-size: 1.1em;
  line-height: 1.8;
  color: #5f646c;
}

.journey-view__section-content :deep(p) {
  margin: 0 0 1.5em;
}

.journey-view__section-content :deep(blockquote) {
  margin: 2em 0;
  padding: 1.5em 2em;
  background: #f8f9fa;
  border-left: 3px solid #c75050;
  font-style: italic;
}

.journey-view__section-content :deep(blockquote p) {
  margin: 0;
}

.journey-view__section-content :deep(blockquote cite) {
  display: block;
  margin-top: 1em;
  font-size: 0.9em;
  color: #9d9c95;
  font-style: normal;
}

.journey-view__section-content :deep(figure) {
  margin: 2em 0;
}

.journey-view__section-content :deep(figure img) {
  width: 100%;
  border-radius: 4px;
}

.journey-view__section-content :deep(figcaption) {
  margin-top: 0.75em;
  font-size: 0.85em;
  color: #9d9c95;
  text-align: center;
}

.journey-view__section-content :deep(hr) {
  border: none;
  border-top: 1px solid #e8e8e8;
  margin: 3em 0;
}

.journey-view__section-content :deep(h3) {
  font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
    'Times New Roman', serif;
  font-size: 1.4em;
  font-weight: 400;
  color: #181922;
  margin: 2em 0 1em;
}

.journey-view__footer {
  text-align: center;
  padding: 6em 2em;
  background: #181922;
  color: #fff;
}

.journey-view__footer-text {
  font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond,
    'Times New Roman', serif;
  font-size: 1.5em;
  color: #d1d2d2;
  margin: 0 0 2em;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.journey-view__back-btn {
  padding: 1em 2em;
  background: transparent;
  color: #47dbb4;
  border: 1px solid #47dbb4;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial,
    sans-serif;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.3s ease;
}

.journey-view__back-btn:hover {
  background: #47dbb4;
  color: #181922;
}

@media (max-width: 720px) {
  .journey-view__meta {
    gap: 1.5em;
    padding: 2em 1em;
  }

  .journey-view__content {
    padding: 2em 1.5em;
  }

  .journey-view__section-title {
    font-size: 1.5em;
  }

  .journey-view__section-content {
    font-size: 1em;
  }

  .journey-view__footer {
    padding: 4em 1.5em;
  }

  .journey-view__footer-text {
    font-size: 1.2em;
  }
}
</style>
