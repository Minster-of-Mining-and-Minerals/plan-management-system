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
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}_medical_diagram_${code}${ext}`;
    const destPath = path.join(UPLOAD_DIR, filename);
    const storedPath = `uploads/attachments/${filename}`;

    try {
      console.log(`[download] ${code} ← ${resolved.sourceTitle}`);
      await sleep(DOWNLOAD_DELAY_MS);
      const buffer = await fetchBuffer(resolved.url);
      fs.writeFileSync(destPath, buffer);
      await diagram.update({ image_file: storedPath, updated_at: new Date() });
      console.log(`[ok] ${code} → ${storedPath}`);
      updated++;
    } catch (e) {
      console.error(`[fail] ${code} — ${e.message}`);
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      failed++;
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
