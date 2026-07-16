"use strict";

/**
 * Clean pg_dump --schema-only output for use as a Sequelize baseline:
 * - strip psql \restrict / \unrestrict meta-commands (pg_dump 18+)
 * - remove SequelizeMeta (managed by sequelize-cli)
 * - force search_path = public (empty path breaks SequelizeMeta writes)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const SCHEMA_PATH = path.join(ROOT, "database", "schema", "baseline_schema.sql");

function cleanSchemaSql(sql) {
  let out = sql;

  // Remove pg_dump 18 restrict wrappers
  out = out.replace(/^\\restrict .*$/gm, "");
  out = out.replace(/^\\unrestrict .*$/gm, "");

  // Remove SequelizeMeta table + PK constraint blocks
  out = out.replace(
    /--\n-- Name: SequelizeMeta; Type: TABLE;[\s\S]*?CREATE TABLE public\."SequelizeMeta" \([\s\S]*?\);\n\n/g,
    ""
  );
  out = out.replace(
    /--\n-- Name: SequelizeMeta SequelizeMeta_pkey; Type: CONSTRAINT;[\s\S]*?ALTER TABLE ONLY public\."SequelizeMeta"\n\s+ADD CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY \(name\);\n\n/g,
    ""
  );

  // Force public search_path (pg_dump sets empty search_path which breaks SequelizeMeta)
  out = out.replace(
    /SELECT pg_catalog\.set_config\('search_path',\s*'',\s*false\);/g,
    "SELECT pg_catalog.set_config('search_path', 'public', false);"
  );

  // Normalize excessive blank lines
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim() + "\n";
}

function main() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`Schema file not found: ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const original = fs.readFileSync(SCHEMA_PATH, "utf8");
  const cleaned = cleanSchemaSql(original);
  fs.writeFileSync(SCHEMA_PATH, cleaned, "utf8");
  console.log(`Cleaned schema written: ${SCHEMA_PATH}`);
  console.log(`Size: ${(Buffer.byteLength(cleaned) / 1024).toFixed(1)} KB`);
}

main();
