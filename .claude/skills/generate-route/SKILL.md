---
name: generate-route
argument-hint: [journey-slug]
description: Generate pre-computed road routes for a journey from its waypoints using OSRM API
---

# Generate Route

## Overview

Generate a `route.json` file for a journey by fetching road routes between waypoints from the OSRM (Open Source Routing Machine) API. This pre-computes the route data so the website doesn't need to make API calls at runtime.

## When to Use

Run this skill after:
1. Creating a new journey markdown file with waypoints
2. Updating waypoints in an existing journey
3. Changing the `route-type` in a journey's frontmatter

## Requirements

The journey must:
- Be in folder-based structure: `public/journeys/[slug]/journey.md`
- Have at least 2 waypoints with `lat` and `lon` coordinates in frontmatter
- Optionally have `route-type` in frontmatter (defaults to `driving`)

## Command

Run the following command, replacing `[slug]` with the journey slug:

```bash
npx tsx scripts/generate-route.ts [slug]
```

## Example

```bash
npx tsx scripts/generate-route.ts winter-hitchhiking-scandinavia
```

## What It Does

1. Reads `public/journeys/[slug]/journey.md`
2. Extracts waypoints and route-type from frontmatter
3. Fetches road routes from OSRM API for each consecutive waypoint pair
4. Simplifies the route to reduce file size
5. Saves result to `public/journeys/[slug]/route.json`

## Output Format

The generated `route.json` contains:

```json
{
  "routeType": "driving",
  "generatedAt": "2026-01-11T17:44:15.778Z",
  "waypointCount": 7,
  "coordinates": [
    [30.045937, 69.727037],
    [30.04077, 69.725975],
    ...
  ]
}
```

## Route Types

The `route-type` frontmatter field controls OSRM profile:

| route-type | OSRM Profile | Description |
|------------|--------------|-------------|
| `driving` (default) | driving | Car routes |
| `walking` | foot | Pedestrian routes |
| `cycling` | bike | Bicycle routes |
| `straight` | - | No route fetched (straight lines) |

## Rate Limiting

The script adds 1-second delays between OSRM API calls to respect rate limits. For journeys with many waypoints, generation may take a minute.

## Updating Routes

Simply re-run the command to regenerate routes. The `route.json` file will be overwritten with fresh data.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Journey file not found" | Ensure journey is in `public/journeys/[slug]/journey.md` |
| "Must have at least 2 waypoints" | Add more waypoints to frontmatter |
| Route looks wrong | Check waypoint lat/lon coordinates |
| Straight lines on map | Ensure `route-type` is not `straight` and route.json exists |
