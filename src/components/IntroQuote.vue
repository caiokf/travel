<script setup lang="ts">
defineProps<{
  quote: string
  author: string
}>()
</script>

<template>
  <div class="intro">
    <blockquote>
      <em>{{ quote }}</em>
      <span>{{ author }}</span>
    </blockquote>
  </div>
</template>

<style scoped>
.intro {
  background: #181922;
  color: #fff;
  font-size: 2em;
  text-align: center;
  z-index: 1000;
  position: relative;
  padding: 3em;
  height: 150vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif;
}

.intro blockquote {
  max-width: 800px;
  margin: 0 auto;
  font-style: normal;
}

.intro em {
  font-size: 1.5em;
  font-style: italic;
  display: block;
}

.intro span {
  color: #464B4B;
  display: block;
  padding: 1em 0;
  font-style: normal;
}

@media (max-width: 720px) {
  .intro {
    font-size: 1.25em;
    padding: 1em;
    height: auto;
    min-height: 100vh;
  }
}
</style>
