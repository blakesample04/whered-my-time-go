// generate-icons.mjs
//
// Regenerates every PWA/app-icon PNG in public/ from the single master
// icon-source.svg, so there's a repeatable pipeline instead of one-off
// hand-exported PNGs (sharp was already a devDependency but nothing used
// it — this is that missing script).
//
// Run with: npm run generate-icons
//
// Produces two families:
//   - "any" icons (icon-192.png, icon-512.png, apple-touch-icon.png,
//     favicon-32.png) — rendered straight from icon-source.svg, which
//     already has its own rounded corners. Fine wherever the OS/browser
//     draws the icon inside its own frame (browser tabs, task switcher,
//     the PWA install prompt).
//   - "maskable" icons (icon-maskable-192.png, icon-maskable-512.png) — a
//     flattened, full-bleed (no pre-rounded corners, no transparency)
//     version, because Android applies its OWN mask shape (circle,
//     squircle, rounded square depending on the device) on top. A
//     pre-rounded source here would look double-framed, and any
//     transparent corner would show through as a hole.
//
// The maskable safe zone (Android's spec) is the center 80% of the
// canvas — the glyph in icon-source.svg already sits well within that
// (roughly the center 43%), so it's reused as-is on the new flat
// background rather than needing to be shrunk further.

import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(rootDir, "public");
const sourceSvg = readFileSync(join(rootDir, "icon-source.svg"), "utf8");

// Same gradient + glyph as icon-source.svg, but on a plain full-bleed
// square (no rx rounding) — see comment above for why maskable needs this.
const maskableSvg = `
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

async function renderPng(svg, size, outPath, { flatten = false } = {}) {
  let pipeline = sharp(Buffer.from(svg), { density: 384 }).resize(size, size);
  if (flatten) pipeline = pipeline.flatten({ background: "#150e18" });
  await pipeline.png().toFile(outPath);
  console.log(`wrote ${outPath} (${size}x${size}${flatten ? ", flattened" : ""})`);
}

async function main() {
  await mkdir(publicDir, { recursive: true });

  await renderPng(sourceSvg, 192, join(publicDir, "icon-192.png"));
  await renderPng(sourceSvg, 512, join(publicDir, "icon-512.png"));
  await renderPng(sourceSvg, 32, join(publicDir, "favicon-32.png"));
  // Apple ignores alpha on touch icons (can render as black) — flatten it.
  await renderPng(sourceSvg, 180, join(publicDir, "apple-touch-icon.png"), { flatten: true });

  await renderPng(maskableSvg, 192, join(publicDir, "icon-maskable-192.png"));
  await renderPng(maskableSvg, 512, join(publicDir, "icon-maskable-512.png"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
