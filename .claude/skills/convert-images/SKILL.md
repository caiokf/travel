---
name: convert-images
description: Use when optimizing journey images for web - converts jpg/jpeg/png to webp with proper EXIF orientation, resizes by image type (hero/thumbnail/content), and updates markdown references
---

# Convert Images

Converts journey images to optimized webp format with correct orientation.

## Quick Reference

| Image Type | Max Width | Quality | Pattern                     |
| ---------- | --------- | ------- | --------------------------- |
| hero       | 1200px    | 80%     | `hero.*`                    |
| thumbnail  | 600px     | 80%     | `thumbnail.*`               |
| content    | 1200px    | 80%     | `img-*.*`, `*.jpg/jpeg/png` |

## Usage

```bash
# Convert specific journey
node .claude/skills/convert-images/convert.mjs iran-hitchhiking

# Convert multiple journeys
node .claude/skills/convert-images/convert.mjs iran-hitchhiking kirkenes-dogsledding

# Convert all non-WIP journeys
node .claude/skills/convert-images/convert.mjs --all
```

## What It Does

1. Finds all jpg/jpeg/png images in journey directory
2. Auto-rotates based on EXIF orientation (fixes upside-down photos)
3. Resizes to appropriate dimensions (without enlarging)
4. Converts to webp at 80% quality
5. Deletes original files
6. Updates `journey.md` references from old extensions to `.webp`

## Critical: EXIF Orientation

The `sharp().rotate()` call with no arguments auto-rotates based on EXIF metadata. Without this, photos taken in portrait mode or rotated on phones will appear sideways or upside-down.
