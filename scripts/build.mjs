import { build as buildVite } from 'vite';
import { build as buildEsbuild } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const tessdataCache = path.join(root, '.cache', 'tessdata');
const languages = ['eng', 'rus'];

await fs.mkdir(tessdataCache, { recursive: true });
for (const language of languages) {
  const cached = path.join(tessdataCache, `${language}.traineddata.gz`);
  try {
    await fs.access(cached);
  } catch {
    try {
      await fs.copyFile(path.join(dist, 'tessdata', `${language}.traineddata.gz`), cached);
    } catch { /* No previous build cache is available. */ }
  }
}

await buildVite({ configFile: path.join(root, 'vite.config.ts') });
for (const [entry, outfile] of [
  ['src/extension/background.ts', 'background.js'],
  ['src/extension/contentGlyph.tsx', 'content.js'],
  ['src/extension/offscreen.ts', 'offscreen.js']
]) {
  await buildEsbuild({
    entryPoints: [path.join(root, entry)], outfile: path.join(dist, outfile), bundle: true,
    format: 'iife', platform: 'browser', target: 'chrome116', sourcemap: false,
    jsx: 'automatic', legalComments: 'none'
  });
}

const tessDir = path.join(dist, 'tesseract');
await fs.mkdir(tessDir, { recursive: true });
const workerSource = path.join(root, 'node_modules/tesseract.js/dist/worker.min.js');
await fs.copyFile(workerSource, path.join(tessDir, 'worker.min.js'));
const coreSource = path.join(root, 'node_modules/tesseract.js-core');
for (const file of await fs.readdir(coreSource)) {
  if (file.startsWith('tesseract-core') && (file.endsWith('.js') || file.endsWith('.wasm'))) {
    await fs.copyFile(path.join(coreSource, file), path.join(tessDir, file));
  }
}

const tessdata = path.join(dist, 'tessdata');
await fs.mkdir(tessdata, { recursive: true });
for (const language of languages) {
  const cached = path.join(tessdataCache, `${language}.traineddata.gz`);
  try {
    await fs.access(cached);
  } catch {
    const response = await fetch(`https://tessdata.projectnaptha.com/4.0.0/${language}.traineddata.gz`);
    if (!response.ok) throw new Error(`Could not download ${language} OCR data (${response.status}).`);
    await fs.writeFile(cached, Buffer.from(await response.arrayBuffer()));
    console.log(`Cached ${language} OCR data`);
  }
  await fs.copyFile(cached, path.join(tessdata, `${language}.traineddata.gz`));
}

console.log('Production extension built in dist/');