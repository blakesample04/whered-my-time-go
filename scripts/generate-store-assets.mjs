// generate-store-assets.mjs
//
// One-off generator for Google Play listing assets that aren't part of the
// app itself (so they don't belong in public/): the 1024x500 feature
// graphic and a flattened 512x512 hi-res icon (Play recommends no alpha
// channel on this one, unlike the "any"-purpose web icon which keeps its
// transparent rounded corners).
//
// Run with: node scripts/generate-store-assets.mjs
// Output: store-assets/feature-graphic.png, store-assets/play-icon-512.png

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(rootDir, "store-assets");

const playIconSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff8a4c"/>
      <stop offset="100%" stop-color="#ff5f7a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="#150e18"/>
  <rect width="512" height="512" fill="url(#g)" fill-opacity="0.92"/>
  <g fill="#fff9f2">
    <rect x="146" y="140" width="220" height="20" rx="8"/>
    <rect x="146" y="352" width="220" height="20" rx="8"/>
    <path d="M166 160 L346 160 L266 256 L346 352 L166 352 L246 256 Z"/>
  </g>
</svg>
`;

// 1024x500, brand gradient, the hourglass mark + wordmark + tagline. Text
// uses a generic bold sans fallback (no custom font embedded) since this
// only needs to render once on whatever machine runs the script.
const featureGraphicSvg = `
<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff8a4c"/>
      <stop offset="100%" stop-color="#ff5f7a"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="#150e18"/>
  <rect width="1024" height="500" fill="url(#bg)" fill-opacity="0.92"/>

  <!-- hourglass mark, left side -->
  <g transform="translate(90, 130)" fill="#fff9f2">
    <rect x="0" y="0" width="176" height="16" rx="7"/>
    <rect x="0" y="224" width="176" height="16" rx="7"/>
    <path d="M16 16 L160 16 L88 120 L160 224 L16 224 L88 120 Z"/>
  </g>

  <!-- wordmark + tagline, right side -->
  <g fill="#fff9f2" font-family="Arial, Helvetica, sans-serif">
    <text x="330" y="230" font-size="64" font-weight="700">Where'd my</text>
    <text x="330" y="300" font-size="64" font-weight="700">time go?</text>
    <text x="330" y="350" font-size="26" font-weight="400" fill-opacity="0.85">Turn reclaimed time into progress on your goals.</text>
  </g>
</svg>
`;

async function main() {
  await mkdir(outDir, { recursive: true });

  await sharp(Buffer.from(playIconSvg), { density: 384 })
    .resize(512, 512)
    .flatten({ background: "#150e18" })
    .png()
    .toFile(join(outDir, "play-icon-512.png"));
  console.log(`wrote ${join(outDir, "play-icon-512.png")}`);

  await sharp(Buffer.from(featureGraphicSvg), { density: 384 })
    .resize(1024, 500)
    .flatten({ background: "#150e18" })
    .png()
    .toFile(join(outDir, "feature-graphic.png"));
  console.log(`wrote ${join(outDir, "feature-graphic.png")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
