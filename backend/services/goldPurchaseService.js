"use strict";

const { Op, fn, col, literal } = require("sequelize");
const {
  sequelize,
  GoldPurchase,
  PurchasingCenter,
  Company,
  AsmMiner,
  GoldMeasurementUnit,
  User,
  SystemAuditLog,
} = require("../models");

/**
 * Returns today's business date formatted as YYYY-MM-DD in the configured application time zone.
 */
function getTodayBusinessDate() {
  const timeZone = process.env.APP_TIMEZONE || "Africa/Addis_Ababa";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Generate a unique, professional purchase receipt reference.
 * Format: GP-{CENTER_CODE}-{YYYYMMDD}-{SEQUENTIAL_NUM}
 */
async function generatePurchaseReference(centerId, businessDate) {
  const center = await PurchasingCenter.findByPk(centerId, { attributes: ["code"] });
  const centerCode = center?.code ? center.code.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8) : "PC";
  const dateStr = businessDate.replace(/-/g, "");

  // Find count of purchases created for this center on this business date to determine sequence
  const count = await GoldPurchase.count({
    where: {
      purchasing_center_id: centerId,
      business_date: businessDate,
    },
    paranoid: false,
  });

  const seq = String(count + 1).padStart(4, "0");
  const baseRef = `GP-${centerCode}-${dateStr}-${seq}`;

  // Verify uniqueness (collision avoidance)
  const existing = await GoldPurchase.findOne({ where: { purchase_reference: baseRef } });
  if (!existing) {
    return baseRef;
  }
  return `GP-${centerCode}-${dateStr}-${seq}-${Date.now().toString().slice(-4)}`;
}

/**
 * Record a new gold purchase.
 *
 * @param {Object} data
 * @param {Object} actor - Authenticated user context
 */
async function recordPurchase(data, actor) {
  let {
    purchasing_center_id,
    seller_type,
    company_id,
    asm_id,
    quantity,
    measurement_unit_id,
    unit_price,
    business_date,
    notes,
  } = data;

  // 1. Resolve and enforce purchasing center ID
  if (actor?.is_purchasing_center) {
    if (purchasing_center_id && purchasing_center_id !== actor.purchasing_center_id) {
      const error = new Error("Access denied: cannot record gold purchase for a different purchasing center.");
      error.status = 403;
      throw error;
    }
    purchasing_center_id = actor.purchasing_center_id;
  }

  if (!purchasing_center_id) {
    const error = new Error("Purchasing center ID is required.");
    error.status = 400;
    throw error;
  }

  const center = await PurchasingCenter.findByPk(purchasing_center_id);
  if (!center) {
    const error = new Error("Purchasing center not found.");
    error.status = 404;
    throw error;
  }
  if (!center.is_active) {
    const error = new Error("Cannot record purchase for an inactive purchasing center.");
    error.status = 403;
    throw error;
  }

  // 2. Validate business date
  const finalBusinessDate = business_date && /^\d{4}-\d{2}-\d{2}$/.test(business_date)
    ? business_date
    : getTodayBusinessDate();

  // 3. Validate quantity
  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0) {
    const error = new Error("Quantity must be a positive decimal greater than zero.");
    error.status = 400;
    throw error;
  }

  // 4. Validate measurement unit
  if (!measurement_unit_id) {
    const error = new Error("Measurement unit is required.");
    error.status = 400;
    throw error;
  }
  const unit = await GoldMeasurementUnit.findByPk(measurement_unit_id);
  if (!unit) {
    const error = new Error("Selected measurement unit was not found.");
    error.status = 404;
    throw error;
  }
  if (!unit.is_active) {
    const error = new Error(`Measurement unit '${unit.name}' is deactivated and cannot be used for new purchases.`);
    error.status = 400;
    throw error;
  }

  const conversionFactor = parseFloat(unit.conversion_factor) || 1.0;
  const canonicalQuantity = parseFloat((qty * conversionFactor).toFixed(4));

  // 5. Validate unit price and compute authoritative total
  const price = unit_price !== undefined && unit_price !== null && unit_price !== ""
    ? parseFloat(unit_price)
    : 0.0;
  if (isNaN(price) || price < 0) {
    const error = new Error("Unit price cannot be negative.");
    error.status = 400;
    throw error;
  }
  const computedTotal = parseFloat((qty * price).toFixed(2));

  // 6. Validate seller type and referential integrity
  if (!seller_type || !["company", "asm"].includes(seller_type)) {
    const error = new Error("Invalid seller type. Must be either 'company' or 'asm'.");
    error.status = 400;
    throw error;
  }

  let sellerNameSnapshot = "";
  let sellerIdentifierSnapshot = null;
  let finalCompanyId = null;
  let finalAsmId = null;

  if (seller_type === "company") {
    if (!company_id) {
      const error = new Error("Company ID is required when seller type is 'company'.");
      error.status = 400;
      throw error;
    }
    const company = await Company.findByPk(company_id);
    if (!company) {
      const error = new Error("Selected company was not found in the Companies registry.");
      error.status = 404;
      throw error;
    }
    if (!company.is_active) {
      const error = new Error(`Company '${company.name}' is marked inactive and is not eligible for gold selling.`);
      error.status = 400;
      throw error;
    }
    finalCompanyId = company.company_id;
    sellerNameSnapshot = company.name;
    sellerIdentifierSnapshot = company.code;
  } else if (seller_type === "asm") {
    if (!asm_id) {
      const error = new Error("ASM ID is required when seller type is 'asm'.");
      error.status = 400;
      throw error;
    }
    const miner = await AsmMiner.findByPk(asm_id);
    if (!miner) {
      const error = new Error("Selected ASM miner was not found in the ASM registry.");
      error.status = 404;
      throw error;
    }
    if (!miner.is_active) {
      const error = new Error(`ASM miner '${miner.full_name}' is inactive and cannot be selected for gold selling.`);
      error.status = 400;
      throw error;
    }
    finalAsmId = miner.asm_id;
    sellerNameSnapshot = miner.full_name;
    sellerIdentifierSnapshot = miner.national_id_number || miner.mining_license_number || miner.phone_number || null;
  }

  // 7. Generate receipt reference
  const purchaseReference = await generatePurchaseReference(purchasing_center_id, finalBusinessDate);

  // 8. Create the gold purchase record
  const purchase = await GoldPurchase.create({
    purchase_reference: purchaseReference,
    purchasing_center_id,
    seller_type,
    company_id: finalCompanyId,
    asm_id: finalAsmId,
    seller_name_snapshot: sellerNameSnapshot,
    seller_identifier_snapshot: sellerIdentifierSnapshot,
    purchase_date: new Date(),
    business_date: finalBusinessDate,
    quantity: qty,
    measurement_unit_id: unit.unit_id,
    unit_code_snapshot: unit.code,
    conversion_factor_snapshot: conversionFactor,
    quantity_in_canonical_unit: canonicalQuantity,
    unit_price: price,
    total_amount: computedTotal,
    currency: "ETB",
    notes: notes ? notes.trim() : null,
    status: "completed",
    created_by_id: actor.user_id,
  });

  // 9. Audit log
  if (actor?.user_id) {
    await SystemAuditLog.create({
      module: "GOLD_PURCHASES",
      action: "CREATE",
      entity_id: purchase.purchase_id,
      entity_label: purchase.purchase_reference,
      summary: `Recorded purchase ${purchase.purchase_reference}: ${qty} ${unit.symbol} (${canonicalQuantity}g base) from ${sellerNameSnapshot} for ${computedTotal} ETB`,
      new_values: purchase.toJSON(),
      changed_by: actor.user_id,
    }).catch((err) => console.error("Audit log error:", err.message));
  }

  return await getPurchaseById(purchase.purchase_id, actor);
}

/**
 * List gold purchases with scoped authorization and multi-criteria filters.
 *
 * @param {Object} query - { purchasing_center_id, seller_type, company_id, asm_id, date_from, date_to, business_date, status, search, page, limit }
 * @param {Object} actor - Authenticated user context
 */
async function listPurchases(query = {}, actor) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const where = {};

  // Scope isolation: Purchasing center accounts can ONLY view their own center's purchases
  if (actor?.is_purchasing_center) {
    where.purchasing_center_id = actor.purchasing_center_id;
  } else if (query.purchasing_center_id) {
    where.purchasing_center_id = query.purchasing_center_id;
  }

  if (query.seller_type && ["company", "asm"].includes(query.seller_type)) {
    where.seller_type = query.seller_type;
  }
  if (query.company_id) {
    where.company_id = query.company_id;
  }
  if (query.asm_id) {
    where.asm_id = query.asm_id;
  }
  if (query.status && ["completed", "cancelled"].includes(query.status)) {
    where.status = query.status;
  }

  // Business date filtering
  if (query.business_date) {
    where.business_date = query.business_date;
  } else if (query.date_from || query.date_to) {
    const dateRange = {};
    if (query.date_from) dateRange[Op.gte] = query.date_from;
    if (query.date_to) dateRange[Op.lte] = query.date_to;
    where.business_date = dateRange;
  }

  if (query.search) {
    const s = `%${query.search.trim()}%`;
    where[Op.or] = [
      { purchase_reference: { [Op.iLike]: s } },
      { seller_name_snapshot: { [Op.iLike]: s } },
      { seller_identifier_snapshot: { [Op.iLike]: s } },
      { unit_code_snapshot: { [Op.iLike]: s } },
    ];
  }

  const { rows, count } = await GoldPurchase.findAndCountAll({
    where,
    include: [
      {
        model: PurchasingCenter,
        as: "purchasingCenter",
        attributes: ["purchasing_center_id", "name", "code", "description"],
      },
      {
        model: Company,
        as: "companySeller",
        attributes: ["company_id", "name", "code", "is_active"],
      },
      {
        model: AsmMiner,
        as: "asmSeller",
        attributes: ["asm_id", "full_name", "national_id_number", "mining_license_number", "phone_number", "is_active"],
      },
      {
        model: GoldMeasurementUnit,
        as: "measurementUnit",
        attributes: ["unit_id", "name", "code", "symbol", "conversion_factor", "is_canonical_base"],
      },
      {
        model: User,
        as: "createdBy",
        attributes: ["user_id", "full_name", "email"],
      },
      {
        model: User,
        as: "cancelledBy",
        attributes: ["user_id", "full_name", "email"],
      },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });

  return {
    items: rows,
    total: count,
    page,
    limit,
    total_pages: Math.ceil(count / limit),
  };
}

/**
 * Get single purchase details by ID with access verification.
 *
 * @param {string} purchaseId
 * @param {Object} actor
 */
async function getPurchaseById(purchaseId, actor) {
  const purchase = await GoldPurchase.findByPk(purchaseId, {
    include: [
      {
        model: PurchasingCenter,
        as: "purchasingCenter",
        attributes: ["purchasing_center_id", "name", "code", "description"],
      },
      {
        model: Company,
        as: "companySeller",
        attributes: ["company_id", "name", "code", "is_active", "logo_path"],
      },
      {
        model: AsmMiner,
        as: "asmSeller",
        attributes: [
          "asm_id",
          "full_name",
          "national_id_number",
          "mining_license_number",
          "phone_number",
          "region",
          "zone_or_woreda",
          "kebele",
          "is_active",
        ],
      },
      {
        model: GoldMeasurementUnit,
        as: "measurementUnit",
        attributes: ["unit_id", "name", "code", "symbol", "conversion_factor", "is_canonical_base"],
      },
      {
        model: User,
        as: "createdBy",
        attributes: ["user_id", "full_name", "email"],
      },
      {
        model: User,
        as: "cancelledBy",
        attributes: ["user_id", "full_name", "email"],
      },
    ],
  });

  if (!purchase) {
    const error = new Error("Gold purchase record not found.");
    error.status = 404;
    throw error;
  }

  // Cross-center isolation check
  if (actor?.is_purchasing_center && purchase.purchasing_center_id !== actor.purchasing_center_id) {
    const error = new Error("Access denied: cannot view purchase recorded at another purchasing center.");
    error.status = 403;
    throw error;
  }

  return purchase;
}

/**
 * Cancel a recorded purchase with required reason and auditable tracking.
 *
 * @param {string} purchaseId
 * @param {string} reason
 * @param {Object} actor
 */
async function cancelPurchase(purchaseId, reason, actor) {
  if (!reason || !reason.trim()) {
    const error = new Error("A cancellation reason is required.");
    error.status = 400;
    throw error;
  }

  const purchase = await getPurchaseById(purchaseId, actor);

  if (purchase.status === "cancelled") {
    const error = new Error("This purchase record is already cancelled.");
    error.status = 400;
    throw error;
  }

  const previousValues = purchase.toJSON();

  purchase.status = "cancelled";
  purchase.cancelled_reason = reason.trim();
  purchase.cancelled_at = new Date();
  purchase.cancelled_by_id = actor.user_id;

  await purchase.save();

  if (actor?.user_id) {
    await SystemAuditLog.create({
      module: "GOLD_PURCHASES",
      action: "CANCEL",
      entity_id: purchase.purchase_id,
      entity_label: purchase.purchase_reference,
      summary: `Cancelled purchase ${purchase.purchase_reference}: ${reason.trim()}`,
      previous_values: previousValues,
      new_values: purchase.toJSON(),
      changed_by: actor.user_id,
    }).catch((err) => console.error("Audit log error:", err.message));
  }

  return await getPurchaseById(purchaseId, actor);
}

module.exports = {
  recordPurchase,
  listPurchases,
  getPurchaseById,
  cancelPurchase,
  getTodayBusinessDate,
};
