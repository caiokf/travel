---
name: format-journey
argument-hint: <journey-slug>
description: Use when a journey folder needs validation or cleanup - checks required files, converts images to webp, generates routes, validates markdown content and image links, then prompts user before fixing issues
---

# Format Journey

Validates a journey folder is complete and follows conventions. Reports all issues, then asks for approval before fixing.

## Usage

```
/format-journey <journey-slug>
```

## Workflow

### Step 1: Check Required Files

Check `public/journeys/<slug>/` contains:

| File | Required | Notes |
|------|----------|-------|
| `journey.md` | Yes | Must exist to proceed |
| `hero.webp` | Yes | Or hero.jpg/png to convert |
| `thumbnail.webp` | Yes | Or thumbnail.jpg/png to convert |
| `route.json` | Yes | Can be generated |

### Step 2: Check Image Formats

Scan folder for any `.jpg`, `.jpeg`, `.png` files. These need conversion to webp.

```bash
ls public/journeys/<slug>/*.{jpg,jpeg,png} 2>/dev/null
```

### Step 3: Check route.json

If missing, note it needs generation from waypoints.

### Step 4: Validate journey.md

**Frontmatter required fields:**
- `id` (nanoid)
- `slug`
- `title`, `subtitle`, `description`
- `date-start`, `date-end`, `duration`
- `countries`
- `status`
- `waypoints` (array with id, name, lat, lon, country, date)

**Image link validation:**
- All `![alt](path)` references point to existing files
- Alt text is descriptive (not empty, "image", "photo", "img")
- Paths use `.webp` extension

**Waypoint structure:**
- Each waypoint in frontmatter has matching `<!-- waypoint: id -->` in body
- Each waypoint section has `# Heading` and `## Subtitle`

**Content quality (flag but don't auto-fix):**
- First person perspective
- Present tense for immediacy
- Sensory details present
- Sections not too thin (< 50 words is suspicious)

### Step 5: Report Issues

Present ALL issues grouped by category:

```
## Issues Found for <slug>

### Missing Files
- [ ] hero.webp missing (hero.jpg found - can convert)
- [ ] route.json missing (can generate from 5 waypoints)

### Image Issues
- [ ] 3 images need conversion to webp: img-foo.jpg, img-bar.png, thumbnail.png
- [ ] Image link broken: img-missing.webp not found
- [ ] Empty alt text on line 45: ![](path.webp)

### Content Issues
- [ ] Waypoint "lima" in frontmatter has no <!-- waypoint: lima --> in body
- [ ] Section "cusco" is thin (32 words) - may need expansion
- [ ] Image references .jpg but should be .webp on line 67

### Warnings (won't auto-fix)
- Section uses past tense: "I walked" instead of "I walk"
- Missing sensory details in "bogota" section
```

### Step 6: Ask for Approval

After listing issues:

```
Should I proceed with the following fixes?
1. Convert 3 images to webp using /convert-images
2. Generate route.json using /generate-route
3. Update image references in journey.md to .webp

Content quality issues flagged above need manual attention.

[Yes / No / Let me fix some things first]
```

### Step 7: Execute Fixes (after approval)

Only after user confirms:

1. **Convert images:** `node .claude/skills/convert-images/convert.mjs <slug>`
2. **Generate route:** `npx tsx scripts/generate-route.ts <slug>`
3. **Fix markdown links:** Edit journey.md to correct broken/wrong-extension links

Report completion and remaining manual items.

## What This Skill Does NOT Auto-Fix

- Content quality (tone, tense, sensory details)
- Missing waypoint sections (needs user to write content)
- Broken image links where file doesn't exist
- Alt text improvements (user should write meaningful descriptions)

These are flagged for manual attention.

## Quick Checklist

```
[ ] journey.md exists with valid frontmatter
[ ] hero.webp exists (or source to convert)
[ ] thumbnail.webp exists (or source to convert)
[ ] route.json exists (or can generate)
[ ] All images are .webp format
[ ] All image links resolve to existing files
[ ] All image links have descriptive alt text
[ ] All frontmatter waypoints have body sections
[ ] Content follows writing-journeys style
```
