#!/usr/bin/env node

import sharp from 'sharp';
import { readdir, readFile, writeFile, unlink } from 'fs/promises';
import { join, basename } from 'path';

const JOURNEYS_DIR = 'public/journeys';

// Image type configurations
const CONFIG = {
  hero: { maxWidth: 1200, quality: 80 },
  thumbnail: { maxWidth: 600, quality: 80 },
  content: { maxWidth: 1200, quality: 80 }
};

function getImageType(filename) {
  const name = basename(filename).toLowerCase();
  if (name.startsWith('hero.')) return 'hero';
  if (name.startsWith('thumbnail.')) return 'thumbnail';
  return 'content';
}

function isImageFile(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  return ['jpg', 'jpeg', 'png'].includes(ext);
}

async function convertImage(inputPath, outputPath, config) {
  await sharp(inputPath)
    .rotate() // Auto-rotate based on EXIF orientation
    .resize(config.maxWidth, null, { withoutEnlargement: true })
    .webp({ quality: config.quality })
    .toFile(outputPath);
}

async function updateMarkdownReferences(journeyDir) {
  const mdPath = join(journeyDir, 'journey.md');

  try {
    let content = await readFile(mdPath, 'utf-8');
    const original = content;

    // Replace image extensions with .webp
    content = content.replace(/\.(jpg|jpeg|png)\)/gi, '.webp)');
    content = content.replace(/\.(jpg|jpeg|png)(\s|$|")/gi, '.webp$2');

    if (content !== original) {
      await writeFile(mdPath, content);
      console.log(`  Updated: journey.md`);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

async function processJourney(slug) {
  const journeyDir = join(JOURNEYS_DIR, slug);
  console.log(`\nProcessing: ${slug}`);

  let files;
  try {
    files = await readdir(journeyDir);
  } catch (err) {
    console.error(`  Error: Journey directory not found: ${journeyDir}`);
    return;
  }

  const imageFiles = files.filter(isImageFile);

  if (imageFiles.length === 0) {
    console.log('  No images to convert');
    return;
  }

  for (const file of imageFiles) {
    const inputPath = join(journeyDir, file);
    const outputPath = join(journeyDir, file.replace(/\.(jpg|jpeg|png)$/i, '.webp'));
    const imageType = getImageType(file);
    const config = CONFIG[imageType];

    try {
      await convertImage(inputPath, outputPath, config);
      await unlink(inputPath);
      console.log(`  Converted: ${file} -> ${basename(outputPath)} (${imageType}: ${config.maxWidth}px)`);
    } catch (err) {
      console.error(`  Error converting ${file}: ${err.message}`);
    }
  }

  await updateMarkdownReferences(journeyDir);
}

async function getAllNonWipJourneys() {
  const dirs = await readdir(JOURNEYS_DIR);
  return dirs.filter(d => !d.startsWith('wip-'));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node convert.mjs <journey-slug> [journey-slug...]');
    console.log('  node convert.mjs --all    # Convert all non-WIP journeys');
    process.exit(1);
  }

  let journeys;

  if (args[0] === '--all') {
    journeys = await getAllNonWipJourneys();
    console.log(`Found ${journeys.length} non-WIP journeys`);
  } else {
    journeys = args;
  }

  for (const slug of journeys) {
    await processJourney(slug);
  }

  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
