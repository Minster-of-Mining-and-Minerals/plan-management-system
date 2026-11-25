"use strict";

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const xlsx = require("xlsx");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");

const TARGET_PASSWORD = "#Test@2026";
const COMPANY_ADMIN_ROLE_ID = "30000000-0000-4000-8000-000000000001";

const excelFile = path.join(
  __dirname,
  "..",
  "comapny-licnese-location-folder",
  "processing_companies_english.xlsx"
);

function extractAbbreviation(companyName) {
  if (!companyName) return "COMP";
  const match = companyName.match(/\(([^)]+)\)/);
  if (match) {
    return match[1].trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  const clean = companyName
    .replace(/plc|ltd|corp|corporation|inc|share\s+company|sc|p\.l\.c\.|s\.c\./gi, "")
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 4).map((w) => w[0].toUpperCase()).join("");
  }
  return clean.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function generateCompanyCode(name, index) {
  const abbr = extractAbbreviation(name) || "PRC";
  const safeAbbr = (abbr.replace(/[^A-Z0-9]/g, "") || "PRC").slice(0, 8);
  return `${safeAbbr}-${String(index + 1).padStart(3, "0")}`;
}

function sanitizeForEmail(name, code) {
  let clean = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (clean.length > 35) {
    clean = clean.slice(0, 35).replace(/_+$/, "");
  }
  if (!clean || clean.length < 2) {
    clean = (code || "comp")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }
  return `${clean}_test_user@gmail.com`;
}

// Regional clusters for template GIS coordinates across Ethiopia
const CLUSTERS = {
  marble: [
    { region: "Benishangul Gumuz", zone: "Asosa", woreda: "Bambasi", lat: 9.75, lon: 34.72 },
    { region: "Oromia", zone: "West Welega", woreda: "Mendi", lat: 9.80, lon: 35.10 },
    { region: "Tigray", zone: "Central Tigray", woreda: "Axum", lat: 14.12, lon: 38.72 },
    { region: "Amhara", zone: "North Shewa", woreda: "Debre Berhan", lat: 9.68, lon: 39.53 },
  ],
  ceramic: [
    { region: "Amhara", zone: "North Shewa", woreda: "Arerti Industrial Zone", lat: 9.25, lon: 39.42 },
    { region: "Oromia", zone: "Special Zone Surrounding Finfinne", woreda: "Dukem", lat: 8.79, lon: 38.90 },
    { region: "Sidama", zone: "Hawassa", woreda: "Hawassa Industrial Hub", lat: 7.05, lon: 38.48 },
    { region: "Amhara", zone: "Wag Hemra", woreda: "Sekota", lat: 12.63, lon: 39.03 },
  ],
  coal: [
    { region: "Oromia", zone: "Illubabor", woreda: "Yayu", lat: 8.35, lon: 35.80 },
    { region: "Benishangul Gumuz", zone: "Kamashi", woreda: "Kamashi", lat: 9.50, lon: 35.85 },
    { region: "South West Ethiopia", zone: "Dawuro", woreda: "Tarcha", lat: 7.15, lon: 37.17 },
  ],
  gold: [
    { region: "Oromia", zone: "Guji", woreda: "Shakiso / Lega Dembi", lat: 5.75, lon: 38.90 },
    { region: "Benishangul Gumuz", zone: "Asosa", woreda: "Kurmuk", lat: 10.55, lon: 34.28 },
    { region: "Gambella", zone: "Anuak", woreda: "Dima", lat: 6.55, lon: 35.15 },
    { region: "Tigray", zone: "North Western Tigray", woreda: "Shire", lat: 14.10, lon: 38.28 },
  ],
  cement: [
    { region: "Oromia", zone: "West Shewa", woreda: "Mugher / Derba Valley", lat: 9.32, lon: 38.52 },
    { region: "Amhara", zone: "East Gojjam", woreda: "Dejen / Blue Nile Gorge", lat: 10.15, lon: 38.13 },
    { region: "Tigray", zone: "South Eastern Tigray", woreda: "Messebo", lat: 13.52, lon: 39.47 },
    { region: "Dire Dawa", zone: "Dire Dawa", woreda: "Industrial Basin", lat: 9.60, lon: 41.86 },
    { region: "Amhara", zone: "North Shewa", woreda: "Lemi Industrial Zone", lat: 9.85, lon: 39.12 },
  ],
  glass: [
    { region: "Oromia", zone: "Special Zone Surrounding Finfinne", woreda: "Sebeta Industrial Area", lat: 8.91, lon: 38.62 },
    { region: "Central Ethiopia", zone: "Gurage", woreda: "Welkite", lat: 8.28, lon: 37.78 },
    { region: "Oromia", zone: "East Shewa", woreda: "Mojo", lat: 8.59, lon: 39.12 },
  ],
  chemical: [
    { region: "Oromia", zone: "East Shewa", woreda: "Adami Tulu / Zeway", lat: 7.86, lon: 38.71 },
    { region: "Oromia", zone: "East Shewa", woreda: "Awash Melkasa", lat: 8.45, lon: 39.33 },
  ],
};

function generateTemplateGis(clusterGroup, index) {
  const clusters = CLUSTERS[clusterGroup] || CLUSTERS.marble;
  const cluster = clusters[index % clusters.length];

  // Micro-offset for this facility based on index
  const latJitter = Number((((index * 17) % 31) * 0.008 - 0.12).toFixed(6));
  const lonJitter = Number((((index * 23) % 31) * 0.008 - 0.12).toFixed(6));

  const baseLat = cluster.lat + latJitter;
  const baseLon = cluster.lon + lonJitter;

  // Concession footprint (~1.5 km across)
  const dLat = 0.012;
  const dLon = 0.012;

  const ring = [
    [Number(baseLon.toFixed(6)), Number(baseLat.toFixed(6))],
    [Number((baseLon + dLon).toFixed(6)), Number((baseLat + 0.003).toFixed(6))],
    [Number((baseLon + dLon - 0.002).toFixed(6)), Number((baseLat + dLat).toFixed(6))],
    [Number((baseLon - 0.002).toFixed(6)), Number((baseLat + dLat - 0.001).toFixed(6))],
    [Number(baseLon.toFixed(6)), Number(baseLat.toFixed(6))],
  ];

  const centroidLat = Number((baseLat + dLat / 2).toFixed(7));
  const centroidLon = Number((baseLon + dLon / 2).toFixed(7));

  return {
    region: cluster.region,
    zone: cluster.zone,
    woreda: cluster.woreda,
    latitude: centroidLat,
    longitude: centroidLon,
    boundaryGeoJSON: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}

async function runSeed() {
  console.log("==============================================================================");
  console.log("STARTING PROCESSING COMPANIES, LICENSES & PRODUCTION ASSIGNMENT SEEDING");
  console.log("==============================================================================");

  if (!fs.existsSync(excelFile)) {
    throw new Error(`Excel file not found at: ${excelFile}`);
  }

  const wb = xlsx.readFile(excelFile);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1 });

  // 1. Ensure Processing License Type
  console.log("[1/6] Ensuring 'Processing' License Type exists in database...");
  let processingType = await db.LicenseType.findOne({ where: { code: "PROCESSING" } });
  if (!processingType) {
    processingType = await db.LicenseType.create({
      license_type_id: uuidv4(),
      name: "Processing",
      code: "PROCESSING",
      description: "Mineral processing, refining, and industrial manufacturing license",
      is_active: true,
    });
    console.log("  ✓ Created Processing license type (PROCESSING)");
  } else {
    console.log("  ✓ Found existing Processing license type (PROCESSING)");
  }

  // 2. Ensure Units
  console.log("[2/6] Ensuring canonical measurement units exist...");
  let unitTon = await db.GoldMeasurementUnit.findOne({
    where: {
      [db.Sequelize.Op.or]: [{ symbol: "t" }, { code: "tonne" }],
    },
  });
  if (!unitTon) {
    unitTon = await db.GoldMeasurementUnit.create({
      unit_id: uuidv4(),
      name: "Metric Tonne",
      code: "tonne",
      symbol: "t",
      conversion_factor: 1000000,
      is_canonical_base: false,
      is_active: true,
    });
  }

  let unitKg = await db.GoldMeasurementUnit.findOne({
    where: {
      [db.Sequelize.Op.or]: [{ symbol: "kg" }, { code: "kg" }],
    },
  });
  if (!unitKg) {
    unitKg = await db.GoldMeasurementUnit.create({
      unit_id: uuidv4(),
      name: "Kilogram",
      code: "kg",
      symbol: "kg",
      conversion_factor: 1000,
      is_canonical_base: false,
      is_active: true,
    });
  }

  // 3. Ensure Monthly Reporting Frequency
  console.log("[3/6] Ensuring 'monthly' reporting frequency exists...");
  let freqMonthly = await db.ProductionReportingFrequency.findOne({ where: { code: "monthly" } });
  if (!freqMonthly) {
    freqMonthly = await db.ProductionReportingFrequency.create({
      frequency_id: uuidv4(),
      name: "Monthly",
      code: "monthly",
      period_type: "month",
      is_active: true,
    });
  }

  // 4. Ensure Production Items for each category
  console.log("[4/6] Ensuring production items exist for all 7 processing categories...");
  const CATEGORY_DEFINITIONS = {
    "Marbele, Granite & Basalt": {
      name: "Marble, Granite & Basalt Slabs",
      code: "PROD-MARBLE-GRANITE-BASALT",
      category: "Dimension Stones",
      unit: unitTon,
      clusterGroup: "marble",
      mineralType: "Marble, Granite & Basalt",
    },
    "Ceramic mining company": {
      name: "Ceramic Products & Tiles",
      code: "PROD-CERAMIC-PRODUCTS",
      category: "Industrial Minerals",
      unit: unitTon,
      clusterGroup: "ceramic",
      mineralType: "Ceramic Raw Materials & Products",
    },
    "Coal mining company": {
      name: "Processed Industrial Coal",
      code: "PROD-PROCESSED-COAL",
      category: "Energy Minerals",
      unit: unitTon,
      clusterGroup: "coal",
      mineralType: "Coal & Coal Briquettes",
    },
    "Gold Mining company": {
      name: "Refined Gold & Bullion",
      code: "PROD-REFINED-GOLD",
      category: "Precious Metals",
      unit: unitKg,
      clusterGroup: "gold",
      mineralType: "Refined Gold & Precious Metals",
    },
    "Cement factory": {
      name: "Portland Cement & Clinker",
      code: "PROD-PORTLAND-CEMENT",
      category: "Cement & Construction",
      unit: unitTon,
      clusterGroup: "cement",
      mineralType: "Cement & Clinker",
    },
    "Glass mining company": {
      name: "Container & Sheet Glass",
      code: "PROD-CONTAINER-GLASS",
      category: "Industrial Minerals",
      unit: unitTon,
      clusterGroup: "glass",
      mineralType: "Glass & Silica Containers",
    },
    "Chemical mining company": {
      name: "Industrial Chemicals & Caustic Soda",
      code: "PROD-INDUSTRIAL-CHEMICALS",
      category: "Chemical Minerals",
      unit: unitTon,
      clusterGroup: "chemical",
      mineralType: "Caustic Soda & Chemicals",
    },
  };

  const productionItemMap = {};
  for (const [catKey, meta] of Object.entries(CATEGORY_DEFINITIONS)) {
    let item = await db.ProductionItem.findOne({
      where: { code: meta.code },
    });
    if (!item) {
      item = await db.ProductionItem.findOne({
        where: db.sequelize.where(
          db.sequelize.fn("LOWER", db.sequelize.col("name")),
          meta.name.toLowerCase()
        ),
      });
    }
    if (!item) {
      item = await db.ProductionItem.create({
        production_item_id: uuidv4(),
        name: meta.name,
        code: meta.code,
        category: meta.category,
        base_unit_id: meta.unit.unit_id,
        default_reporting_unit_id: meta.unit.unit_id,
        description: `Industrial processing reporting for ${meta.name}`,
        is_active: true,
      });
      console.log(`  ✓ Created Production Item: ${meta.name} (${meta.code})`);
    } else {
      console.log(`  ✓ Found Production Item: ${item.name} (${item.code})`);
    }
    productionItemMap[catKey] = item;
  }

  // 5. Parse Excel Rows
  console.log("[5/6] Parsing processing companies from Excel...");
  let currentCategory = "";
  const parsedEntries = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    if (row[0] === "" || row[0] === null || row[0] === undefined) {
      if (row[1]) {
        currentCategory = String(row[1]).trim();
      }
    } else if (typeof row[0] === "number") {
      const compName = String(row[1]).trim();
      parsedEntries.push({
        num: row[0],
        name: compName,
        category: currentCategory,
      });
    }
  }

  console.log(`  ✓ Found ${parsedEntries.length} total processing company entries in Excel.`);

  // 6. Process companies, licenses, assignments, and test users
  console.log("[6/6] Seeding companies, processing licenses, GIS polygons, and test users...");
  const passwordHash = await bcrypt.hash(TARGET_PASSWORD, 10);

  let createdComps = 0;
  let matchedComps = 0;
  let createdLicenses = 0;
  let updatedLicenses = 0;
  let createdAssignments = 0;
  let createdUsers = 0;
  let updatedUsers = 0;

  for (let idx = 0; idx < parsedEntries.length; idx++) {
    const entry = parsedEntries[idx];
    const catMeta = CATEGORY_DEFINITIONS[entry.category] || CATEGORY_DEFINITIONS["Marbele, Granite & Basalt"];
    const prodItem = productionItemMap[entry.category] || productionItemMap["Marbele, Granite & Basalt"];

    // A. Match or create Company
    let company = await db.Company.findOne({
      where: db.sequelize.where(
        db.sequelize.fn("LOWER", db.sequelize.col("name")),
        entry.name.toLowerCase()
      ),
    });

    if (!company) {
      const compCode = generateCompanyCode(entry.name, idx);
      const abbr = extractAbbreviation(entry.name);
      company = await db.Company.create({
        company_id: uuidv4(),
        name: entry.name,
        code: compCode,
        abbreviation: abbr,
        company_status: "active",
        is_active: true,
      });
      createdComps++;
    } else {
      matchedComps++;
    }

    // B. Build GIS Template Location
    const gis = generateTemplateGis(catMeta.clusterGroup, idx);

    // C. Upsert Processing License
    const licenseNumber = `MOM/PRL/2024/${String(idx + 1).padStart(3, "0")}`;
    let license = await db.CompanyLicense.findOne({
      where: { license_number: licenseNumber },
    });

    const licensePayload = {
      company_id: company.company_id,
      license_type_id: processingType.license_type_id,
      license_number: licenseNumber,
      license_name: `${company.name} - ${catMeta.name} Processing Facility`,
      status: "active",
      issued_date: "2024-01-15",
      effective_start_date: "2026-07-08",
      effective_end_date: "2027-07-07",
      effective_year_from: 2019,
      effective_year_to: 2019,
      mineral_type: catMeta.mineralType,
      region: gis.region,
      zone: gis.zone,
      woreda: gis.woreda,
      location_details: `${gis.woreda}, ${gis.zone}, ${gis.region} Mineral Processing Concession`,
      latitude: gis.latitude,
      longitude: gis.longitude,
      boundary_geojson: gis.boundaryGeoJSON,
      spatial_reference: "GCS Adindan",
      description: `Official industrial mineral processing and manufacturing license for ${company.name}`,
      is_active: true,
    };

    if (!license) {
      license = await db.CompanyLicense.create({
        license_id: uuidv4(),
        ...licensePayload,
      });
      createdLicenses++;
    } else {
      await license.update(licensePayload);
      updatedLicenses++;
    }

    // D. Upsert Company Production Assignment
    let assignment = await db.CompanyProductionAssignment.findOne({
      where: {
        company_id: company.company_id,
        license_id: license.license_id,
        production_item_id: prodItem.production_item_id,
      },
    });

    const assignmentPayload = {
      reporting_frequency_id: freqMonthly.frequency_id,
      default_reporting_unit_id: prodItem.base_unit_id,
      target_allocation_depth: "monthly",
      effective_from: "2026-07-08",
      effective_to: "2027-07-07",
      requires_review: true,
      allow_past_reporting: true,
      allow_report_updates: true,
      past_reporting_duration: 30,
      past_reporting_unit: "days",
      is_active: true,
    };

    if (!assignment) {
      assignment = await db.CompanyProductionAssignment.create({
        assignment_id: uuidv4(),
        company_id: company.company_id,
        license_id: license.license_id,
        production_item_id: prodItem.production_item_id,
        ...assignmentPayload,
      });
      createdAssignments++;
    } else {
      await assignment.update(assignmentPayload);
    }

    // E. Ensure Test User with Company Administrator Role
    const userEmail = sanitizeForEmail(company.name, company.code);
    let user = await db.User.findOne({
      where: db.sequelize.where(
        db.sequelize.fn("LOWER", db.sequelize.col("email")),
        userEmail.toLowerCase()
      ),
    });

    if (!user) {
      user = await db.User.create({
        user_id: uuidv4(),
        full_name: `${company.name} Administrator`,
        email: userEmail.toLowerCase(),
        password: passwordHash,
        is_active: true,
        is_first_logged_in: false,
        password_changed_at: new Date(),
        company_id: company.company_id,
      });
      createdUsers++;
    } else {
      await user.update({
        password: passwordHash,
        is_active: true,
        is_first_logged_in: false,
        password_changed_at: new Date(),
        company_id: company.company_id,
      });
      updatedUsers++;
    }

    // Link Company Administrator role
    await db.UserRoles.findOrCreate({
      where: {
        user_id: user.user_id,
        role_id: COMPANY_ADMIN_ROLE_ID,
      },
      defaults: {
        user_role_id: uuidv4(),
        user_id: user.user_id,
        role_id: COMPANY_ADMIN_ROLE_ID,
        is_active: true,
        assigned_at: new Date(),
      },
    });
  }

  console.log("==============================================================================");
  console.log("SEEDING SUMMARY:");
  console.log(`  Companies Created:     ${createdComps}`);
  console.log(`  Companies Matched:     ${matchedComps}`);
  console.log(`  Total Companies:       ${createdComps + matchedComps}`);
  console.log(`  Licenses Created:      ${createdLicenses}`);
  console.log(`  Licenses Updated:      ${updatedLicenses}`);
  console.log(`  Assignments Created:   ${createdAssignments}`);
  console.log(`  Test Users Created:    ${createdUsers}`);
  console.log(`  Test Users Updated:    ${updatedUsers}`);
  console.log(`  Default Password:      ${TARGET_PASSWORD}`);
  console.log("==============================================================================");
  return {
    createdComps,
    matchedComps,
    createdLicenses,
    updatedLicenses,
    createdAssignments,
    createdUsers,
    updatedUsers,
  };
}

if (require.main === module) {
  runSeed()
    .then(() => {
      console.log("✅ Processing companies seeding completed successfully!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}

module.exports = runSeed;
