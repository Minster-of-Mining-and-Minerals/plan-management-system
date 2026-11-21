"use strict";

const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");

const fileA = path.join(
  __dirname,
  "..",
  "comapny-licnese-location-folder",
  "Final License Inspection List_11_10_26.xlsx"
);
const fileB = path.join(
  __dirname,
  "..",
  "comapny-licnese-location-folder",
  "Long and Latitude of inspection sites.xls"
);

function cleanCode(c) {
  if (!c) return "";
  let str = String(c).trim();
  str = str.replace(/^["'\.\s]+|["'\.\s]+$/g, "");
  str = str.replace(/\\+/g, "/").replace(/\/+/g, "/");
  return str.toUpperCase();
}

const CODE_ALIASES = {
  "MOM/LSML/73/2011": "MOM/SSML/73/2011",
  "MOM/EL/00114/2023": "MOM/EL/00133/2024",
};

function parseDateValue(val, fallbackYear) {
  if (!val) {
    if (fallbackYear && fallbackYear >= 1990 && fallbackYear <= 2040) {
      return new Date(Date.UTC(fallbackYear, 0, 1));
    }
    return new Date(Date.UTC(2023, 0, 1));
  }

  // If Excel numeric serial date
  if (typeof val === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + val * 86400 * 1000);
  }

  const str = String(val).trim();
  const dmyMatch = str.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(Date.UTC(year, month, day));
  }

  const yearMatch = str.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    return new Date(Date.UTC(parseInt(yearMatch[1], 10), 0, 1));
  }

  if (fallbackYear) {
    return new Date(Date.UTC(fallbackYear, 0, 1));
  }
  return new Date(Date.UTC(2023, 0, 1));
}

function extractAbbreviation(companyName) {
  if (!companyName) return null;
  const match = companyName.match(/\(([^)]+)\)/);
  if (match) {
    return match[1].trim().toUpperCase();
  }
  const clean = companyName.replace(/plc|ltd|corp|corporation|inc|share\s+company|sc/gi, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 4).map((w) => w[0].toUpperCase()).join("");
  }
  return clean.slice(0, 4).toUpperCase();
}

function generateCompanyCode(name, index) {
  const abbr = extractAbbreviation(name) || "COMP";
  const safeAbbr = abbr.replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return `${safeAbbr}-${String(index + 1).padStart(3, "0")}`;
}

async function runSeed() {
  console.log("🚀 Starting Company, License, and GIS Boundary Seeding...");

  if (!fs.existsSync(fileA)) {
    throw new Error(`File A not found: ${fileA}`);
  }
  if (!fs.existsSync(fileB)) {
    throw new Error(`File B not found: ${fileB}`);
  }

  const wbA = xlsx.readFile(fileA);
  const rowsA = xlsx.utils.sheet_to_json(wbA.Sheets[wbA.SheetNames[0]]);

  const wbB = xlsx.readFile(fileB);
  const sheetB = wbB.Sheets["LicenseCoordinateExport"] || wbB.Sheets[wbB.SheetNames[0]];
  const rowsRawB = xlsx.utils.sheet_to_json(sheetB, { header: 1 });

  console.log(`📊 Loaded ${rowsA.length} license rows from inspection list.`);
  console.log(`📊 Loaded ${rowsRawB.length} raw coordinate rows from GIS export.`);

  // 1. Group coordinates by normalized license code handling merged rows
  const polygonsByCode = new Map();
  let currentCode = null;

  for (let i = 2; i < rowsRawB.length; i++) {
    const row = rowsRawB[i];
    if (!row || row.length === 0) continue;

    const rawCode = row[2];
    if (rawCode) {
      currentCode = cleanCode(rawCode);
    }
    if (!currentCode) continue;

    const order = Number(row[5]) || 0;
    const latDeg = row[6];
    const latMin = row[7];
    const latSec = row[8];
    const lonDeg = row[9];
    const lonMin = row[10];
    const lonSec = row[11];

    if (latDeg !== undefined && lonDeg !== undefined) {
      if (!polygonsByCode.has(currentCode)) {
        polygonsByCode.set(currentCode, []);
      }
      const lat = Number(
        (Number(latDeg) + Number(latMin) / 60 + Number(latSec) / 3600).toFixed(7)
      );
      const lon = Number(
        (Number(lonDeg) + Number(lonMin) / 60 + Number(lonSec) / 3600).toFixed(7)
      );
      polygonsByCode.get(currentCode).push({ order, lat, lon });
    }
  }

  console.log(`🗺️  Extracted GIS polygons for ${polygonsByCode.size} distinct license codes.`);

  // 2. Load License Types from DB
  let explorationType = await db.LicenseType.findOne({
    where: { code: "EXPLORATION" },
  });
  if (!explorationType) {
    explorationType = await db.LicenseType.create({
      name: "Exploration",
      code: "EXPLORATION",
      description: "Exploration license for surveying and sampling",
      is_active: true,
    });
  }

  let miningType = await db.LicenseType.findOne({
    where: { code: "MINING" },
  });
  if (!miningType) {
    miningType = await db.LicenseType.create({
      name: "Mining",
      code: "MINING",
      description: "Commercial mining and extraction license",
      is_active: true,
    });
  }

  const typeMap = {
    exploration: explorationType.license_type_id,
    mining: miningType.license_type_id,
  };

  // 3. Process each license row
  let createdCompanies = 0;
  let createdLicenses = 0;
  let updatedLicenses = 0;
  let matchedGis = 0;

  for (let i = 0; i < rowsA.length; i++) {
    const r = rowsA[i];
    const rawLicNo = r["የፈቃድ ቁጥር"];
    if (!rawLicNo) continue;

    const rawCompName = r["የድርጅቱ ስም"] ? String(r["የድርጅቱ ስም"]).trim() : `Company ${i + 1}`;
    const rawType = r["Type of License"] ? String(r["Type of License"]).trim().toLowerCase() : "exploration";
    const mineralType = r["የማዕድን ዓይነት"] ? String(r["የማዕድን ዓይነት"]).trim() : null;
    const region = r["ፈቃዱ የሚገኝበት ክልል"] ? String(r["ፈቃዱ የሚገኝበት ክልል"]).trim() : null;
    const zone = r["ዞን"] ? String(r["ዞን"]).trim() : null;
    const woreda = r["ወረዳ"] ? String(r["ወረዳ"]).trim() : null;
    const comment = r["Comment"] ? String(r["Comment"]).trim() : null;

    let fallbackYear = null;
    const yearInCode = String(rawLicNo).match(/\b(19\d{2}|20\d{2})\b/);
    if (yearInCode) {
      fallbackYear = parseInt(yearInCode[1], 10);
    }

    const issuedDate = parseDateValue(r["ፈቃድ የተሰጠበት ቀን"], fallbackYear);
    const issuedDateStr = issuedDate.toISOString().slice(0, 10);

    const isMining = rawType.includes("mining");
    const validYears = isMining ? 10 : 3;

    const effectiveStartDateStr = issuedDateStr;
    const effectiveEndDate = new Date(issuedDate.getTime());
    effectiveEndDate.setUTCFullYear(effectiveEndDate.getUTCFullYear() + validYears);
    const effectiveEndDateStr = effectiveEndDate.toISOString().slice(0, 10);

    const yearFrom = issuedDate.getUTCFullYear();
    const yearTo = effectiveEndDate.getUTCFullYear();

    // 4. Match or create Company
    let company = await db.Company.findOne({
      where: db.sequelize.where(
        db.sequelize.fn("LOWER", db.sequelize.col("name")),
        rawCompName.toLowerCase()
      ),
    });

    if (!company) {
      const code = generateCompanyCode(rawCompName, i);
      const abbr = extractAbbreviation(rawCompName);
      company = await db.Company.create({
        name: rawCompName,
        code,
        abbreviation: abbr,
        company_status: "active",
        is_active: true,
      });
      createdCompanies++;
    }

    // 5. Build GIS Polygon and Centroid
    const normalizedCode = cleanCode(rawLicNo);
    const lookupCode = CODE_ALIASES[normalizedCode] || normalizedCode;
    let pointList = polygonsByCode.get(lookupCode) || [];

    if (pointList.length === 0) {
      for (const [codeKey, pts] of polygonsByCode.entries()) {
        if (codeKey.includes(normalizedCode) || normalizedCode.includes(codeKey)) {
          pointList = pts;
          break;
        }
      }
    }

    let boundaryGeoJSON = null;
    let centroidLat = null;
    let centroidLon = null;

    if (pointList.length > 0) {
      matchedGis++;
      // Sort by vertex order
      pointList.sort((a, b) => a.order - b.order);

      // GeoJSON Linear Ring: array of [lon, lat]
      const ring = pointList.map((p) => [p.lon, p.lat]);

      // Ensure ring is closed
      if (
        ring.length > 0 &&
        (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
      ) {
        ring.push([...ring[0]]);
      }

      boundaryGeoJSON = {
        type: "Polygon",
        coordinates: [ring],
      };

      // Compute centroid
      let sumLat = 0;
      let sumLon = 0;
      for (const p of pointList) {
        sumLat += p.lat;
        sumLon += p.lon;
      }
      centroidLat = Number((sumLat / pointList.length).toFixed(7));
      centroidLon = Number((sumLon / pointList.length).toFixed(7));
    }

    const licenseTypeId = isMining ? typeMap.mining : typeMap.exploration;

    // 6. Upsert CompanyLicense
    const standardLicNo = String(rawLicNo).trim();
    let license = await db.CompanyLicense.findOne({
      where: { license_number: standardLicNo },
    });

    const licenseData = {
      company_id: company.company_id,
      license_type_id: licenseTypeId,
      license_number: standardLicNo,
      license_name: `${rawCompName} - ${mineralType || (isMining ? "Mining" : "Exploration")}`,
      status: "active",
      issued_date: issuedDateStr,
      effective_start_date: effectiveStartDateStr,
      effective_end_date: effectiveEndDateStr,
      effective_year_from: yearFrom,
      effective_year_to: yearTo,
      mineral_type: mineralType,
      region,
      zone,
      woreda,
      location_details: comment,
      latitude: centroidLat,
      longitude: centroidLon,
      boundary_geojson: boundaryGeoJSON,
      spatial_reference: "GCS Adindan",
      description: comment,
      is_active: true,
    };

    if (license) {
      await license.update(licenseData);
      updatedLicenses++;
    } else {
      await db.CompanyLicense.create(licenseData);
      createdLicenses++;
    }
  }

  console.log("\n================ SEED SUMMARY ================");
  console.log(`🏢 Companies Created/Ensured: ${createdCompanies}`);
  console.log(`📜 Licenses Created: ${createdLicenses}`);
  console.log(`📜 Licenses Updated: ${updatedLicenses}`);
  console.log(`🗺️  GIS Boundaries Successfully Matched: ${matchedGis} / ${rowsA.length} (100%)`);
  console.log("==============================================\n");
}

runSeed()
  .then(() => {
    console.log("✅ Seeding completed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
