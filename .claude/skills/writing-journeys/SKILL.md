---
name: writing-journeys
description: Use when user wants to write about a journey or trip they took - interviews them for vivid details and stories, then delegates to Writer agent to create markdown file with proper frontmatter and waypoint structure
---

# Writing Journeys

## Overview

Create markdown journey files through deep interviewing. Probe for vivid details and emotional moments before writing. Delegate final writing to Writer agent (Task tool with subagent_type="Writer").

Journey files live in `public/journeys/[slug]/` folders containing:
- `journey.md` - the journey markdown file
- `hero.png` - hero image for the header
- `thumbnail.png` - thumbnail for the timeline
- `route.json` - pre-generated road routes (created with `/generate-route` skill)

## Process

### Phase 1: Interview (You do this)

**Start broad, then dig into interesting threads:**

1. "What was this journey?" - Get the basics (where, when, how long)
2. "What moment still sticks with you?" - Find the emotional core
3. "Tell me more about that..." - Probe the interesting parts

**Keep probing until you understand:**
- The 2-4 key moments/turning points
- Sensory details (weather, sounds, smells, textures)
- The people encountered and what made them memorable
- What the journey meant to them / what changed

**Also gather waypoint data:**
- List of locations visited (in order)
- Dates at each location (or approximate)
- If user has Polarsteps/GPS data, get coordinates and weather

**Red flags - you don't have enough yet if:**
- You only know places and dates
- You haven't heard a specific story with dialogue or detail
- You don't know what made this journey different from others

### Phase 2: Write (Writer agent does this)

**IMPORTANT:** Use the Task tool with `subagent_type: "Writer"` - NOT a skill.

First, generate a nanoid for the journey ID:
```bash
node -e "const {nanoid} = require('/Users/caiokf/development/caiokf/travel/node_modules/.pnpm/nanoid@3.3.11/node_modules/nanoid/index.cjs'); console.log(nanoid())"
```

Then dispatch the Writer agent with the full structure:

```
Task tool call:
- subagent_type: "Writer"
- prompt: |
    Write a journey markdown file for public/journeys/[slug]/journey.md

    FRONTMATTER (use this exact structure):
    ---
    id: [the nanoid you generated]
    slug: [kebab-case-journey-name]
    title: [evocative title]
    subtitle: [short tagline]
    description: [1-2 sentence hook]

    # Dates
    date-start: [ISO date like 2016-03-13]
    date-end: [ISO date like 2016-03-31]
    duration: [X days]

    # Geography
    countries: [array of countries]
    distance: [approximate distance]

    # Display
    thumbnail: /img/journeys/[slug]/thumb.jpg
    hero-image: /img/journeys/[slug]/hero.jpg
    status: completed

    # Tags
    tags: [array of relevant tags]

    # Waypoints (one per location)
    waypoints:
      - id: [kebab-case-location]
        name: [Display Name]
        lat: [latitude]
        lon: [longitude]
        country: [Country]
        date: [ISO date]
        weather: { condition: [weather], temp: [temp] }
      # ... more waypoints
    ---

    BODY STRUCTURE:
    Each waypoint section follows this pattern:

    <!-- waypoint: [waypoint-id] -->
    # [Location Name]
    ## [Evocative Subtitle]

    [Story content with sensory details...]

    ![Image description](/img/journeys/[slug]/[image].jpg)
    *Caption for the image*

    > "Quote from someone"
    > — Person's name

    ---

    STORY GATHERED:
    [Include all the details you gathered - moments, sensory details, people, meaning]

    STYLE:
    - First person, present tense for immediacy
    - Rich sensory details
    - Let the moments breathe - don't rush through them
    - Include dialogue where natural
    - Each waypoint section: 150-400 words
```

**Do NOT:**
- Write the content yourself - delegate to Writer
- Make up a nanoid - generate it with the command above
- Use a Skill tool - use Task with subagent_type="Writer"
- Skip waypoint markers - every section needs `<!-- waypoint: id -->`

## Frontmatter Reference

| Field | Format | Example |
|-------|--------|---------|
| id | nanoid | `V1StGXR8_Z5jdHi6B-myT` |
| slug | kebab-case | `winter-hitchhiking-scandinavia` |
| title | string | `Frozen Thumbs, Open Doors` |
| subtitle | string | `Hitchhiking Arctic Scandinavia` |
| description | string | `Three weeks hitchhiking through Arctic Scandinavia...` |
| date-start | ISO date | `2016-03-13` |
| date-end | ISO date | `2016-03-31` |
| duration | string | `19 days` |
| countries | array | `[Norway, Sweden, Finland]` |
| distance | string | `~1200 km` |
| thumbnail | path | `/img/journeys/scandinavia-2016/thumb.jpg` |
| hero-image | path | `/img/journeys/scandinavia-2016/hero.jpg` |
| status | enum | `completed` or `planned` |
| tags | array | `[hitchhiking, winter, arctic]` |
| waypoints | array | See waypoint structure below |

### Waypoint Structure

```yaml
- id: vardo              # kebab-case, matches <!-- waypoint: id -->
  name: Vardø            # Display name with accents
  lat: 70.3706           # Latitude (decimal degrees)
  lon: 31.1095           # Longitude (decimal degrees)
  country: Norway        # Country name
  date: 2016-03-14       # Date arrived (ISO)
  weather:               # Optional weather data
    condition: clear-night
    temp: -1
```

## Body Content Structure

```markdown
<!-- waypoint: vardo -->
# Vardø
## The Birdwatcher's House

Story paragraphs here...

![Telescope on third floor](/img/journeys/scandinavia-2016/vardo-telescope.jpg)
*Looking for seabirds at midnight*

> "This house belongs to a friend in Switzerland"
> — The driver

More story content...

---

<!-- waypoint: honningsvag -->
# Honningsvåg
## Gateway to Nordkapp

Next section...
```

### Content Block Mapping

| Markdown | Renders As |
|----------|-----------|
| Paragraph text | `paragraph` block |
| `![alt](src)` + `*caption*` | `image` block |
| `> quote` + `> — author` | `quote` block |
| `<!-- gallery -->` ... `<!-- /gallery -->` | `gallery` block |
| `---` | Section divider |

## Image Organization

All images for a journey go in the journey folder: `public/journeys/[slug]/`

Required images:
- `hero.png` - Hero header background (1920x1080 recommended)
- `thumbnail.png` - Timeline card thumbnail (800x600 recommended)

Optional waypoint images:
- `[waypoint-id].jpg` - Images for specific waypoints

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Writing immediately | Interview first - you need stories, not just facts |
| Checklist questions | Follow interesting threads, ask "tell me more" |
| Writing content yourself | Delegate to Writer agent with gathered details |
| Missing waypoint markers | Every section needs `<!-- waypoint: id -->` before heading |
| Waypoint ID mismatch | Body `<!-- waypoint: X -->` must match frontmatter waypoint id |
| Missing coordinates | Every waypoint needs lat/lon for map rendering |
| Thin story details | Keep probing until you have dialogue, sensory details, emotional moments |

## File Location

All journeys go in `public/journeys/[slug]/` with this structure:

```
public/journeys/winter-hitchhiking-scandinavia/
├── journey.md      # The markdown file
├── hero.png        # Hero image (1920x1080 recommended)
├── thumbnail.png   # Timeline thumbnail (800x600 recommended)
└── route.json      # Generated with /generate-route skill
```

## After Creating a Journey

1. Create the folder: `mkdir -p public/journeys/[slug]`
2. Save the markdown as `journey.md` in the folder
3. Add hero.png and thumbnail.png images
4. Run `/generate-route [slug]` to create route.json
5. Add the slug to `JOURNEY_SLUGS` array in `src/services/journeyService.ts`
