"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { sequelize } = require("../models");
const {
  SECTOR_ID: ALT_MOM_SECTOR_ID,
  SECTOR_NAME: ALT_MOM_SECTOR_NAME,
  ROOT_MINISTER_NAME,
} = require("../seeders/data/alternativeMomOrganogram.data");
const { INSTITUTES } = require("../seeders/data/alternativeMomInstitutesOrganogram.data");

const ORGANOGRAM_SECTORS = [
  {
    label: "Ministry of Mines (organogram.zip — ministerial units)",
    sectorId: ALT_MOM_SECTOR_ID,
    sectorName: ALT_MOM_SECTOR_NAME,
    rootName: ROOT_MINISTER_NAME,
  },
  ...INSTITUTES.map((institute) => ({
    label: institute.name,
    sectorId: institute.sectorId,
    sectorName: institute.name,
    rootName: "Director General",
  })),
];

async function resolveSectorId(expectedId, sectorName) {
  const rows = await sequelize.query(
    `SELECT government_structure_id FROM government_structures
     WHERE government_structure_id = :id
        OR LOWER(TRIM(name)) = LOWER(TRIM(:name))
     ORDER BY CASE WHEN government_structure_id = :id THEN 0 ELSE 1 END
     LIMIT 1`,
    {
      replacements: { id: expectedId, name: sectorName },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return rows[0]?.government_structure_id ?? null;
}

function buildSectorTree(nodes) {
  if (!nodes?.length) return [];
  const nodeMap = new Map();
  const getId = (node) => node.internal_structure_id;

  for (const node of nodes) {
    const id = getId(node);
    if (id) nodeMap.set(id, { ...node, children: [] });
  }

  const rootNodes = [];
  for (const node of nodes) {
    const id = getId(node);
    const currentNode = nodeMap.get(id);
    if (!currentNode) continue;
    if (node.parent_id) {
      const parentNode = nodeMap.get(node.parent_id);
      if (parentNode) parentNode.children.push(currentNode);
      else rootNodes.push(currentNode);
    } else {
      rootNodes.push(currentNode);
    }
  }
  return rootNodes;
}

function countTreeNodes(node) {
  let count = 1;
  for (const child of node.children ?? []) {
    count += countTreeNodes(child);
  }
  return count;
}

function parseOrganogramZipNodeCount() {
  const dataXml = path.join(
    __dirname,
    "..",
    "minster-office-organogram",
    "organogram_zip_extract",
    "word",
    "diagrams",
    "data1.xml"
  );
  const fallbackXml = path.join(
    __dirname,
    "..",
    "minster-office-organogram",
    "docx_extract",
    "word",
    "diagrams",
    "data1.xml"
  );
  const xmlPath = fs.existsSync(dataXml) ? dataXml : fallbackXml;
  if (!fs.existsSync(xmlPath)) {
    return null;
  }

  const xml = fs.readFileSync(xmlPath, "utf8");
  const pts = [...xml.matchAll(/<dgm:pt modelId="\{([^}]+)\}"[^>]*>([\s\S]*?)<\/dgm:pt>/g)];
  const idToText = {};
  for (const match of pts) {
    const texts = [...match[2].matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)]
      .map((part) => part[1].trim())
      .filter(Boolean);
    if (texts.length) idToText[match[1]] = texts.join(" ");
  }

  return {
    labeledNodes: Object.keys(idToText).length,
    hasMinister: Object.values(idToText).includes("Minister"),
    source: path.basename(path.dirname(path.dirname(path.dirname(xmlPath)))),
  };
}

async function validateSector(expectedId, sectorName, expectedRootName) {
  const sectorId = await resolveSectorId(expectedId, sectorName);
  assert.ok(
    sectorId,
    `Sector "${sectorName}" (${expectedId}) must exist — run npm run seed:organogram`
  );
  assert.strictEqual(
    sectorId,
    expectedId,
    `Sector "${sectorName}" must use canonical ID ${expectedId} (found ${sectorId}). Re-run npm run seed:organogram.`
  );

  const sector = await sequelize.query(
    `SELECT government_structure_id, name FROM government_structures
     WHERE government_structure_id = :sectorId`,
    { replacements: { sectorId }, type: sequelize.QueryTypes.SELECT }
  );
  assert.strictEqual(sector.length, 1, `Sector ${sectorId} must exist`);

  const departments = await sequelize.query(
    `SELECT internal_structure_id, name, parent_id, level, is_active
     FROM internal_structures
     WHERE government_structure_id = :sectorId AND is_active = true
     ORDER BY level ASC, name ASC`,
    { replacements: { sectorId }, type: sequelize.QueryTypes.SELECT }
  );

  assert.ok(departments.length > 0, `${sector[0].name} must have active departments`);

  const tree = buildSectorTree(departments);
  assert.ok(tree.length > 0, `${sector[0].name} must have at least one root department`);

  if (expectedRootName) {
    assert.strictEqual(
      tree[0].name,
      expectedRootName,
      `${sector[0].name} root should be "${expectedRootName}"`
    );
  }

  const treeNodeCount = tree.reduce((sum, root) => sum + countTreeNodes(root), 0);
  assert.strictEqual(
    treeNodeCount,
    departments.length,
    `${sector[0].name} tree must include every department`
  );

  return {
    sectorName: sector[0].name,
    departmentCount: departments.length,
    rootName: tree[0].name,
    childCount: tree[0].children?.length ?? 0,
  };
}

async function main() {
  console.log("Validating organogram.zip department trees...\n");

  const zipMeta = parseOrganogramZipNodeCount();
  if (zipMeta) {
    console.log(
      `Source diagram (${zipMeta.source}): ${zipMeta.labeledNodes} labeled nodes, Minister root: ${zipMeta.hasMinister ? "yes" : "no"}`
    );
    console.log("");
  } else {
    console.log("Warning: organogram diagram XML not found — skipping source file check.\n");
  }

  const results = [];
  for (const entry of ORGANOGRAM_SECTORS) {
    const result = await validateSector(
      entry.sectorId,
      entry.sectorName,
      entry.rootName ?? "Minister"
    );
    results.push({ ...entry, ...result });
    console.log(`OK  ${entry.label}`);
    console.log(`    Sector: ${result.sectorName} (${entry.sectorId})`);
    console.log(
      `    Departments: ${result.departmentCount} | Root: ${result.rootName} | Direct children: ${result.childCount}`
    );
    console.log("");
  }

  console.log("All organogram sectors validated.");
  await sequelize.close();
}

main().catch(async (error) => {
  console.error("Organogram validation failed:");
  console.error(error.message);
  try {
    await sequelize.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
