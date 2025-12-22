---
name: creating-journeys
description: Use when creating new interactive storytelling journeys with maps - guides generation of waypoints, story sections, and geographic coordinates following established patterns
---

# Creating Journeys

## Overview

This skill enables automated generation of interactive storytelling journeys. Given a list of places and a brief description, generate complete journey data including waypoints with geographic coordinates, story sections with evocative travel-journal style content, and map configuration.

## When to Use

**Use this skill when:**

- Creating a new storytelling journey from a list of places
- Adding waypoints and story sections to an existing journey
- Writing travel-journal style content for locations
- Setting up map coordinates for a route

**Don't use for:**

- Modifying map rendering logic (see `useD3Map.ts`)
- Changing routing service configuration
- Adding new Vue components

## Core Pattern

### Waypoint Data Structure

```typescript
import type { Waypoint } from '../types'

export const waypoints: Waypoint[] = [
  {
    id: 'city-name',        // lowercase, kebab-case
    name: 'Display Name',   // Can include accents (e.g., "Lisboa")
    x: 180,                 // Canvas X coordinate (viewBox 2000x1400)
    y: 780,                 // Canvas Y coordinate (viewBox 2000x1400)
    pathPosition: 0         // 0-1 position along journey (0=start, 1=end)
  }
]
```

### Story Section Structure

```typescript
import type { StorySection } from '../types'

export const storySections: StorySection[] = [
  {
    id: 'city-name',
    waypointId: 'city-name',    // Links to waypoint.id
    title: 'City Name',
    subtitle: 'Evocative Tagline',
    intro: 'Optional intro paragraph with scene-setting.',
    blocks: [
      {
        type: 'paragraph',
        content: 'Story content with sensory details...'
      },
      {
        type: 'image',
        src: '/img/journey/1.jpg',
        caption: 'Descriptive caption for the image'
      },
      {
        type: 'quote',
        content: 'Quote text in original language',
        author: 'Author Name — Translation if needed'
      },
      {
        type: 'gallery',
        images: ['/img/journey/2.jpg', '/img/journey/3.jpg']
      }
    ]
  }
]
```

### Geographic Coordinates (for Map)

```typescript
// In useD3Map.ts - format is [longitude, latitude] (GeoJSON convention)
const cityCoordinates: Record<string, [number, number]> = {
  lisbon: [-9.1393, 38.7223],
  sevilla: [-5.9845, 37.3891],
  paris: [2.3522, 48.8566]
}
```

### Trip Metadata

```typescript
import type { Trip } from '../types'

export const trips: Trip[] = [
  {
    id: 'journey-slug',              // URL-safe lowercase
    title: 'The Journey Title',
    subtitle: 'From X to Y',
    description: 'Brief description of the journey.',
    thumbnail: '/img/trips/thumb.jpg',
    heroImage: '/img/hero.jpg',
    route: '/trips/journey-slug'
  }
]
```

## Quick Reference

### Content Block Types

| Type | Required Fields | Optional Fields |
|------|-----------------|-----------------|
| `paragraph` | `content` | - |
| `image` | `src` | `caption` |
| `quote` | `content` | `author` |
| `gallery` | `images` (array) | - |

### Coordinate Format

| Component | Format | Example |
|-----------|--------|---------|
| Longitude | Decimal degrees, West is negative | `-9.1393` |
| Latitude | Decimal degrees, South is negative | `38.7223` |
| Order | `[longitude, latitude]` | `[-9.1393, 38.7223]` |

### Path Position Values

| Position | Value | Notes |
|----------|-------|-------|
| First waypoint | `0` | Journey start |
| Last waypoint | `1` | Journey end |
| Middle | Proportional | e.g., 4th of 7 = `0.50` |

## Implementation

### Step 1: Gather Input

Collect from user:
- Ordered list of places (cities/locations)
- Brief description or theme for the journey
- Any specific stories or highlights to include

### Step 2: Look Up Coordinates

For each place, find geographic coordinates:
- Use Google Maps, OpenStreetMap, or similar
- Format: `[longitude, latitude]` (note: lon first, not lat)
- Add to `cityCoordinates` in `useD3Map.ts`

### Step 3: Calculate Waypoint Positions

```typescript
// For N waypoints, distribute pathPosition evenly
const pathPositions = waypoints.map((_, i, arr) =>
  i / (arr.length - 1)  // 0, 0.33, 0.67, 1 for 4 waypoints
)

// Canvas coordinates (x, y) are approximate - roughly match geography
// viewBox is 2000x1400, center around ~1000x700
```

### Step 4: Write Story Content

Follow the content style guide (see below). For each location:
1. Write 3-4 paragraphs with sensory details
2. Add 1-2 images with evocative captions
3. Include quotes where appropriate
4. Create an intro for the first section

### Step 5: Update Files

| File | What to Add |
|------|-------------|
| `src/data/story.ts` | Waypoints array, StorySections array |
| `src/composables/useD3Map.ts` | City coordinates to `cityCoordinates` |
| `src/data/trips.ts` | Trip metadata entry |
| `public/img/journey/` | Journey images |

## Content Style Guide

### Voice and Tone

- **First person plural**: "We wandered...", "The city greeted us..."
- **Present tense for immediacy**: "The streets echo..."
- **Past tense for reflection**: "We understood then why..."
- **Evocative and sensory**: Sounds, scents, textures, light

### Paragraph Structure

- 2-4 sentences per paragraph
- Mix observation, action, and reflection
- Include specific details: place names, local foods, historical facts
- Use literary devices: metaphors, personification

### Example Style

```
"Lisbon greeted us with golden light reflecting off the Tagus River,
the city's seven hills rising like ancient guardians. We wandered
through the narrow alleys of Alfama, the oldest district, where
laundry hung between buildings and the scent of grilled sardines
filled the air."
```

**Key elements:**
- Sensory detail: "golden light", "scent of sardines"
- Geographic context: "Tagus River", "seven hills"
- Personification: "city greeted us"
- Local authenticity: "Alfama", specific dishes

### Subtitles

Use evocative taglines, not just descriptions:
- "Where the Journey Begins" (not "Starting Point")
- "The Last Moorish Kingdom" (not "Islamic Heritage")
- "Gaudi's Dreamscape" (not "Modernist Architecture")

### Quotes

For non-English quotes, format author as:
```typescript
author: 'Francisco de Icaza — Give him alms, woman, for there is nothing so cruel as being blind in Granada'
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Lat/lng order reversed | Use `[longitude, latitude]`, not `[lat, lng]` |
| Missing pathPosition | Every waypoint needs `pathPosition` from 0-1 |
| Generic content | Add specific local details, foods, historical facts |
| Prose too long | Keep paragraphs to 2-4 sentences |
| No sensory details | Include sights, sounds, scents in every section |
| Mismatched IDs | `waypointId` must exactly match `waypoint.id` |

## File Placement

```
src/
  data/
    story.ts      # Waypoints and story sections
    trips.ts      # Trip metadata for listing page
  composables/
    useD3Map.ts   # Add city coordinates here
public/
  img/
    journey/      # Journey images (1.jpg, 2.jpg, etc.)
    trips/        # Trip thumbnails
```

## Edge Cases

### Unknown Locations

Look up coordinates at:
- Google Maps: Right-click > "What's here?"
- OpenStreetMap: Click location for coordinates
- Format as decimal degrees with 4 decimal places

### Non-European Journeys

The current map projection is centered on Western Europe. For other regions:
- Adjust projection center in `useD3Map.ts`
- Modify scale for appropriate zoom level
- Update `journeyCountries` array for highlighting

### Missing Images

Content works without images initially:
- Omit image blocks until photos are available
- Use placeholder captions noting "Photo coming soon"
- Add gallery blocks for multiple photos of same location
