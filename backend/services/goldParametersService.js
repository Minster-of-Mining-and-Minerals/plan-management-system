"use strict";

const fs = require("fs");
const path = require("path");
const { sequelize } = require("../models");

const SETTING_KEY = "gold_specification_parameters_v1";
const BACKUP_FILE_PATH = path.join(__dirname, "../../uploads/gold_parameters_config.json");

const DEFAULT_SETTINGS = {
  is_specs_module_enabled: true,
  is_purchasing_premium_enabled: true,
  purchasing_premium_rate: 15.0,
  purchasing_premium_name: "Artisan & Central Bank Incentive Premium",
  gold_types: [
    { id: "gt-1", name: "Raw/Placer Gold", description: "Unrefined alluvial placer gold from riverbeds or shallow pits", is_available: true, is_system: true },
    { id: "gt-2", name: "Smelted Bar", description: "Locally melted and cast crude bullion bar", is_available: true, is_system: true },
    { id: "gt-3", name: "Refined Bullion", description: "Assayed high-purity commercial gold bar", is_available: true, is_system: true },
    { id: "gt-4", name: "Gold Dust", description: "Fine particulate gold recovered through panning or gravity separation", is_available: true, is_system: true },
    { id: "gt-5", name: "Gold Nugget", description: "Naturally occurring dense gold specimen nuggets", is_available: true, is_system: true },
    { id: "gt-6", name: "Dore Bar", description: "Semi-pure alloy bar containing precious metals", is_available: true, is_system: true },
  ],
  karat_grades: [
    { id: "kg-1", karat: "24K", label: "24K (99.9% Pure)", default_purity_percentage: 99.9, min_purity: 99.0, max_purity: 100.0, is_available: true, is_system: true },
    { id: "kg-2", karat: "22K", label: "22K (91.6% Pure)", default_purity_percentage: 91.6, min_purity: 90.0, max_purity: 93.0, is_available: true, is_system: true },
    { id: "kg-3", karat: "21K", label: "21K (87.5% Pure)", default_purity_percentage: 87.5, min_purity: 86.0, max_purity: 89.0, is_available: true, is_system: true },
    { id: "kg-4", karat: "20K", label: "20K (83.3% Pure)", default_purity_percentage: 83.3, min_purity: 81.0, max_purity: 85.0, is_available: true, is_system: true },
    { id: "kg-5", karat: "18K", label: "18K (75.0% Pure)", default_purity_percentage: 75.0, min_purity: 73.0, max_purity: 78.0, is_available: true, is_system: true },
    { id: "kg-6", karat: "14K", label: "14K (58.5% Pure)", default_purity_percentage: 58.5, min_purity: 56.0, max_purity: 62.0, is_available: true, is_system: true },
    { id: "kg-7", karat: "10K", label: "10K (41.7% Pure)", default_purity_percentage: 41.7, min_purity: 40.0, max_purity: 45.0, is_available: false, is_system: true },
    { id: "kg-8", karat: "Raw", label: "Raw / Unrefined Assayed", default_purity_percentage: 80.0, min_purity: 50.0, max_purity: 95.0, is_available: true, is_system: true },
  ],
  quality_grades: [
    { id: "qg-1", grade: "Grade A", label: "Grade A - High Purity Export Grade", description: "Cleaned, high purity certified gold meeting national export reserve standards", is_available: true, is_system: true },
    { id: "qg-2", grade: "Grade B", label: "Grade B - Standard Commercial Grade", description: "Standard commercial trade gold meeting institutional bank intake specifications", is_available: true, is_system: true },
    { id: "qg-3", grade: "Grade C", label: "Grade C - Artisanal / Small-Scale Grade", description: "Field-sourced artisanal gold requiring secondary refinery smelting", is_available: true, is_system: true },
    { id: "qg-4", grade: "Grade D", label: "Grade D - Low Purity / Alluvial Aggregate", description: "Low purity alluvial composite requiring heavy chemical processing", is_available: true, is_system: true },
  ],
};

let inMemoryCache = null;

async function ensureTableExists() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS gold_parameter_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.warn("Could not ensure gold_parameter_settings table:", err?.message);
  }
}

function readBackupFile() {
  try {
    if (fs.existsSync(BACKUP_FILE_PATH)) {
      const raw = fs.readFileSync(BACKUP_FILE_PATH, "utf8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Could not read backup gold parameters file:", err?.message);
  }
  return null;
}

function writeBackupFile(data) {
  try {
    const dir = path.dirname(BACKUP_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BACKUP_FILE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.warn("Could not write backup gold parameters file:", err?.message);
  }
}

async function getGoldParametersSettings() {
  if (inMemoryCache) {
    return inMemoryCache;
  }

  await ensureTableExists();

  try {
    const [rows] = await sequelize.query(
      `SELECT setting_value, updated_at FROM gold_parameter_settings WHERE setting_key = :key LIMIT 1;`,
      { replacements: { key: SETTING_KEY } }
    );

    if (rows && rows.length > 0) {
      const val = typeof rows[0].setting_value === "string" 
        ? JSON.parse(rows[0].setting_value) 
        : rows[0].setting_value;
      inMemoryCache = {
        ...DEFAULT_SETTINGS,
        ...val,
        updated_at: rows[0].updated_at,
      };
      return inMemoryCache;
    }
  } catch (err) {
    console.warn("Database query for gold parameter settings failed, trying file backup:", err?.message);
  }

  // Fallback to file backup
  const backup = readBackupFile();
  if (backup) {
    inMemoryCache = { ...DEFAULT_SETTINGS, ...backup };
    return inMemoryCache;
  }

  inMemoryCache = { ...DEFAULT_SETTINGS, updated_at: new Date().toISOString() };
  return inMemoryCache;
}

async function updateGoldParametersSettings(updates = {}) {
  await ensureTableExists();

  const current = await getGoldParametersSettings();
  const merged = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // 1. Update in-memory
  inMemoryCache = merged;

  // 2. Persist to file
  writeBackupFile(merged);

  // 3. Persist to DB
  try {
    await sequelize.query(
      `
      INSERT INTO gold_parameter_settings (setting_key, setting_value, updated_at)
      VALUES (:key, :val, NOW())
      ON CONFLICT (setting_key)
      DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW();
      `,
      {
        replacements: {
          key: SETTING_KEY,
          val: JSON.stringify(merged),
        },
      }
    );
  } catch (err) {
    console.warn("Could not upsert into gold_parameter_settings table:", err?.message);
  }

  return inMemoryCache;
}

module.exports = {
  getGoldParametersSettings,
  updateGoldParametersSettings,
};
