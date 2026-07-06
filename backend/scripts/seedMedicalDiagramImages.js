#!/usr/bin/env node
"use strict";

/**
 * Downloads medical diagram images from Wikimedia Commons and updates medical_diagrams.image_file.
 * Uses pre-resolved URLs (medicalDiagramResolvedUrls.json) to avoid API rate limits.
 *
 * Usage:
 *   node scripts/seedMedicalDiagramImages.js
 *   node scripts/seedMedicalDiagramImages.js --force
 *   node scripts/seedMedicalDiagramImages.js --only=heart,lung,oph_cornea
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const db = require("../models");
const {
  MEDICAL_DIAGRAM_WIKIMEDIA_SOURCES,
} = require("../config/medicalDiagramImageSources");

const USER_AGENT = "NovaCurePlatform/1.0 (medical diagram seed; local dev)";
const UPLOAD_DIR = path.join(__dirname, "../uploads/attachments");
const RESOLVED_URLS_PATH = path.join(
  __dirname,
  "../config/medicalDiagramResolvedUrls.json"
);
const FORCE = process.argv.includes("--force");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "")
  .split("=")[1]
  ?.split(",")
  .filter(Boolean);
const DOWNLOAD_DELAY_MS = 1200;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadResolvedUrls() {
  if (!fs.existsSync(RESOLVED_URLS_PATH)) return {};
  return JSON.parse(fs.readFileSync(RESOLVED_URLS_PATH, "utf8"));
}

function fetchBuffer(url, retries = 5) {
  return new Promise((resolve, reject) => {
    const attempt = (left) => {
      const lib = url.startsWith("https") ? https : http;
      const req = lib.get(
        url,
        { headers: { "User-Agent": USER_AGENT } },
        (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            fetchBuffer(res.headers.location, left).then(resolve).catch(reject);
            return;
          }
          if (res.statusCode === 429 && left > 0) {
            const wait = (6 - left) * 5000;
            console.warn(`  [rate-limit] retry in ${wait}ms…`);
            setTimeout(() => attempt(left - 1), wait);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        }
      );
      req.on("error", reject);
    };
    attempt(retries);
  });
}

function extensionFromUrl(url) {
  try {
    const ext = path.extname(new URL(url).pathname.split("%")[0]);
    if (ext === ".svg") return ".png";
    return ext || ".png";
  } catch {
    return ".png";
  }
}

function hasLocalImage(imageFile) {
  if (!imageFile) return false;
  const stored = imageFile.replace(/^https?:\/\/[^/]+\//, "");
  const localPath = path.join(__dirname, "..", stored.replace(/\//g, path.sep));
  return fs.existsSync(localPath);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createPlaceholderSvg(code, name) {
  const label = escapeXml(name || code);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#f1f5f9"/>
  <rect x="40" y="40" width="720" height="520" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
  <text x="400" y="270" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" fill="#334155">${label}</text>
  <text x="400" y="310" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" fill="#64748b">${escapeXml(code)}</text>
  <text x="400" y="350" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#94a3b8">Placeholder — run seed:diagram-images when online</text>
</svg>`;
  return Buffer.from(svg, "utf8");
}

async function saveDiagramImage(diagram, buffer, ext) {
  const { code } = diagram;
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}_medical_diagram_${code}${ext}`;
  const destPath = path.join(UPLOAD_DIR, filename);
  const storedPath = `uploads/attachments/${filename}`;
  fs.writeFileSync(destPath, buffer);
  await diagram.update({ image_file: storedPath, updated_at: new Date() });
  return storedPath;
}

function resolveUrlForCode(code, urlCache) {
  const candidates = MEDICAL_DIAGRAM_WIKIMEDIA_SOURCES[code] || [];
  for (const title of candidates) {
    if (urlCache[title]) {
      return { url: urlCache[title], sourceTitle: title };
    }
  }
  return null;
}

async function main() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const urlCache = loadResolvedUrls();
  const diagrams = await db.MedicalDiagram.findAll({ order: [["code", "ASC"]] });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const diagram of diagrams) {
    const { code, name } = diagram;

    if (ONLY?.length && !ONLY.includes(code)) continue;

    if (!FORCE && hasLocalImage(diagram.image_file)) {
      console.log(`[skip] ${code} — image on disk`);
      skipped++;
      continue;
    }

    const resolved = resolveUrlForCode(code, urlCache);
    if (!resolved) {
      console.warn(`[fail] ${code} (${name}) — no resolved URL`);
      failed++;
      continue;
    }

    const ext = extensionFromUrl(resolved.url);

    try {
      console.log(`[download] ${code} ← ${resolved.sourceTitle}`);
      await sleep(DOWNLOAD_DELAY_MS);
      const buffer = await fetchBuffer(resolved.url);
      const storedPath = await saveDiagramImage(diagram, buffer, ext);
      console.log(`[ok] ${code} → ${storedPath}`);
      updated++;
    } catch (e) {
      console.error(`[fail] ${code} — ${e.message}`);
      try {
        const storedPath = await saveDiagramImage(
          diagram,
          createPlaceholderSvg(code, name),
          ".svg"
        );
        console.log(`[placeholder] ${code} → ${storedPath}`);
        updated++;
      } catch (placeholderErr) {
        console.error(`[fail] ${code} placeholder — ${placeholderErr.message}`);
        failed++;
      }
    }
  }

  console.log(
    `\nDone. Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`
  );
  process.exit(failed > 0 && updated === 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
