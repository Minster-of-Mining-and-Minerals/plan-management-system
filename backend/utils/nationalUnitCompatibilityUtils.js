"use strict";

const UNIT_CONVERSION_TABLE = {
  mass: {
    base: "kg",
    units: {
      g: 0.001,
      gram: 0.001,
      grams: 0.001,
      kg: 1.0,
      kilogram: 1.0,
      kilograms: 1.0,
      quintal: 100.0,
      quintals: 100.0,
      ton: 1000.0,
      tons: 1000.0,
      tonne: 1000.0,
      tonnes: 1000.0,
      metric_ton: 1000.0,
      metric_tons: 1000.0,
      ounce: 0.0283495,
      ounces: 0.0283495,
      oz: 0.0283495,
    },
  },
  volume: {
    base: "m3",
    units: {
      l: 0.001,
      liter: 0.001,
      liters: 0.001,
      litre: 0.001,
      litres: 0.001,
      m3: 1.0,
      cubic_meter: 1.0,
      cubic_meters: 1.0,
      barrel: 0.158987,
      barrels: 0.158987,
      bbl: 0.158987,
      gallon: 0.00378541,
      gallons: 0.00378541,
    },
  },
  count: {
    base: "count",
    units: {
      count: 1.0,
      counts: 1.0,
      unit: 1.0,
      units: 1.0,
      piece: 1.0,
      pieces: 1.0,
      person: 1.0,
      people: 1.0,
      site: 1.0,
      sites: 1.0,
      license: 1.0,
      licenses: 1.0,
      certificate: 1.0,
      certificates: 1.0,
      number: 1.0,
      numbers: 1.0,
    },
  },
  area: {
    base: "sq_m",
    units: {
      sq_m: 1.0,
      sqm: 1.0,
      m2: 1.0,
      hectare: 10000.0,
      hectares: 10000.0,
      ha: 10000.0,
      sq_km: 1000000.0,
      sqkm: 1000000.0,
      km2: 1000000.0,
    },
  },
  currency: {
    base: "etb",
    units: {
      etb: 1.0,
      birr: 1.0,
      ethiopian_birr: 1.0,
      usd: 1.0,
    },
  },
};

function normalizeUnit(unit) {
  if (!unit || typeof unit !== "string") return "";
  return unit
    .toLowerCase()
    .trim()
    .replace(/[\s\-_]+/g, "_");
}

function getUnitCategory(unit) {
  const norm = normalizeUnit(unit);
  if (!norm) return "custom";

  for (const [category, data] of Object.entries(UNIT_CONVERSION_TABLE)) {
    if (data.units[norm] !== undefined) {
      return category;
    }
  }

  return "custom";
}

function areUnitsCompatible(unitA, unitB) {
  const normA = normalizeUnit(unitA);
  const normB = normalizeUnit(unitB);

  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const catA = getUnitCategory(normA);
  const catB = getUnitCategory(normB);

  if (catA === "custom" || catB === "custom") {
    return false;
  }

  return catA === catB;
}

function getConversionFactor(fromUnit, toUnit) {
  const normFrom = normalizeUnit(fromUnit);
  const normTo = normalizeUnit(toUnit);

  if (normFrom === normTo) {
    return 1.0;
  }

  const catFrom = getUnitCategory(normFrom);
  const catTo = getUnitCategory(normTo);

  if (catFrom === "custom" || catTo === "custom" || catFrom !== catTo) {
    throw new Error(
      `Incompatible units: cannot convert from '${fromUnit}' (${catFrom}) to '${toUnit}' (${catTo})`
    );
  }

  const fromFactor = UNIT_CONVERSION_TABLE[catFrom].units[normFrom];
  const toFactor = UNIT_CONVERSION_TABLE[catTo].units[normTo];

  if (!fromFactor || !toFactor) {
    throw new Error(
      `Missing conversion factor for '${fromUnit}' or '${toUnit}' in category '${catFrom}'`
    );
  }

  return fromFactor / toFactor;
}

function convertValue(amount, fromUnit, toUnit) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return null;
  }

  const factor = getConversionFactor(fromUnit, toUnit);
  const result = Number(amount) * factor;

  // Decimal safe precision up to 6 decimal places
  return Math.round(result * 1000000) / 1000000;
}

function getSupportedUnitsCatalog() {
  const result = {};
  for (const [category, data] of Object.entries(UNIT_CONVERSION_TABLE)) {
    result[category] = {
      base: data.base,
      units: Object.keys(data.units),
    };
  }
  return result;
}

module.exports = {
  UNIT_CONVERSION_TABLE,
  normalizeUnit,
  getUnitCategory,
  areUnitsCompatible,
  getConversionFactor,
  convertValue,
  getSupportedUnitsCatalog,
};

