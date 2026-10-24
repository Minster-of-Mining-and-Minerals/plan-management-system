"use strict";

const { Op } = require("sequelize");
const {
  GoldDailyReport,
  GoldPurchase,
  PurchasingCenter,
  GoldMeasurementUnit,
  Company,
  AsmMiner,
  User,
  SystemAuditLog,
} = require("../models");
const { getTodayBusinessDate } = require("./goldPurchaseService");

/**
 * Compute the authoritative daily gold purchasing summary dynamically from eligible
 * transaction records for a given purchasing center and business date.
 *
 * @param {string} centerId
 * @param {string} businessDate - YYYY-MM-DD
 * @param {Object} actor
 */
async function getDailyReport(centerId, businessDate, actor) {
  const date = businessDate || getTodayBusinessDate();

  // Scope check
  if (actor?.is_purchasing_center && centerId !== actor.purchasing_center_id) {
    const error = new Error("Access denied: cannot view daily report for a different purchasing center.");
    error.status = 403;
    throw error;
  }

  const center = await PurchasingCenter.findByPk(centerId, {
    attributes: ["purchasing_center_id", "name", "code", "description", "is_active"],
  });
  if (!center) {
    const error = new Error("Purchasing center not found.");
    error.status = 404;
    throw error;
  }

  // 1. Fetch all eligible purchases for this center and business date
  const purchases = await GoldPurchase.findAll({
    where: {
      purchasing_center_id: centerId,
      business_date: date,
    },
    include: [
      {
        model: GoldMeasurementUnit,
        as: "measurementUnit",
        attributes: ["unit_id", "name", "code", "symbol", "conversion_factor", "is_canonical_base"],
      },
      {
        model: Company,
        as: "companySeller",
        attributes: ["company_id", "name", "code"],
      },
      {
        model: AsmMiner,
        as: "asmSeller",
        attributes: ["asm_id", "full_name", "national_id_number", "mining_license_number", "phone_number"],
      },
      {
        model: User,
        as: "createdBy",
        attributes: ["user_id", "full_name", "email"],
      },
    ],
    order: [["created_at", "ASC"]],
  });

  const activePurchases = purchases.filter((p) => p.status === "completed");
  const cancelledPurchases = purchases.filter((p) => p.status === "cancelled");

  // 2. Aggregate metrics across active purchases
  let totalCanonicalQuantity = 0;
  let totalAmount = 0;

  const unitMap = new Map();
  const sellerSummary = {
    company: {
      purchase_count: 0,
      total_canonical_quantity: 0,
      total_amount: 0,
    },
    asm: {
      purchase_count: 0,
      total_canonical_quantity: 0,
      total_amount: 0,
    },
  };

  for (const p of activePurchases) {
    const qty = parseFloat(p.quantity) || 0;
    const canonical = parseFloat(p.quantity_in_canonical_unit) || 0;
    const amount = parseFloat(p.total_amount) || 0;

    totalCanonicalQuantity += canonical;
    totalAmount += amount;

    // Unit breakdown
    const unitCode = p.unit_code_snapshot || p.measurementUnit?.code || "unknown";
    if (!unitMap.has(unitCode)) {
      unitMap.set(unitCode, {
        unit_id: p.measurement_unit_id,
        code: unitCode,
        name: p.measurementUnit?.name || unitCode,
        symbol: p.measurementUnit?.symbol || unitCode,
        total_quantity: 0,
        purchase_count: 0,
        conversion_factor: parseFloat(p.conversion_factor_snapshot) || 1.0,
      });
    }
    const uEntry = unitMap.get(unitCode);
    uEntry.total_quantity = parseFloat((uEntry.total_quantity + qty).toFixed(4));
    uEntry.purchase_count += 1;

    // Seller breakdown
    if (p.seller_type === "company") {
      sellerSummary.company.purchase_count += 1;
      sellerSummary.company.total_canonical_quantity = parseFloat(
        (sellerSummary.company.total_canonical_quantity + canonical).toFixed(4)
      );
      sellerSummary.company.total_amount = parseFloat(
        (sellerSummary.company.total_amount + amount).toFixed(2)
      );
    } else if (p.seller_type === "asm") {
      sellerSummary.asm.purchase_count += 1;
      sellerSummary.asm.total_canonical_quantity = parseFloat(
        (sellerSummary.asm.total_canonical_quantity + canonical).toFixed(4)
      );
      sellerSummary.asm.total_amount = parseFloat(
        (sellerSummary.asm.total_amount + amount).toFixed(2)
      );
    }
  }

  totalCanonicalQuantity = parseFloat(totalCanonicalQuantity.toFixed(4));
  totalAmount = parseFloat(totalAmount.toFixed(2));
  const unitBreakdown = Array.from(unitMap.values());

  // 3. Check if a formal report submission record exists in gold_daily_reports
  const submittedRecord = await GoldDailyReport.findOne({
    where: {
      purchasing_center_id: centerId,
      business_date: date,
    },
    include: [
      {
        model: User,
        as: "submittedBy",
        attributes: ["user_id", "full_name", "email"],
      },
      {
        model: User,
        as: "reviewedBy",
        attributes: ["user_id", "full_name", "email"],
      },
    ],
  });

  const isDivergent = submittedRecord
    ? submittedRecord.total_purchases !== activePurchases.length ||
      Math.abs(parseFloat(submittedRecord.total_quantity_canonical) - totalCanonicalQuantity) > 0.0001 ||
      Math.abs(parseFloat(submittedRecord.total_amount) - totalAmount) > 0.01
    : false;

  return {
    purchasing_center: center,
    business_date: date,
    summary: {
      total_purchases: activePurchases.length,
      cancelled_purchases_count: cancelledPurchases.length,
      total_quantity_canonical: totalCanonicalQuantity,
      total_amount: totalAmount,
      currency: "ETB",
      unit_breakdown: unitBreakdown,
      seller_breakdown: sellerSummary,
    },
    submission: submittedRecord
      ? {
          report_id: submittedRecord.report_id,
          status: submittedRecord.status,
          submitted_at: submittedRecord.submitted_at,
          submitted_by: submittedRecord.submittedBy,
          reviewed_at: submittedRecord.reviewed_at,
          reviewed_by: submittedRecord.reviewedBy,
          notes: submittedRecord.notes,
          is_divergent: isDivergent,
        }
      : {
          status: "unsubmitted",
          is_divergent: false,
        },
    transactions: purchases,
  };
}

/**
 * Submit the daily report for a purchasing center and business date.
 * Reconciles with underlying transactions to record an auditable report snapshot.
 *
 * @param {string} centerId
 * @param {string} businessDate
 * @param {string} notes
 * @param {Object} actor
 */
async function submitDailyReport(centerId, businessDate, notes, actor) {
  // Scope check
  if (actor?.is_purchasing_center && centerId !== actor.purchasing_center_id) {
    const error = new Error("Access denied: cannot submit daily report for another purchasing center.");
    error.status = 403;
    throw error;
  }

  const computed = await getDailyReport(centerId, businessDate, actor);

  const existing = await GoldDailyReport.findOne({
    where: {
      purchasing_center_id: centerId,
      business_date: computed.business_date,
    },
  });

  let report;
  if (existing) {
    const previousValues = existing.toJSON();
    existing.total_purchases = computed.summary.total_purchases;
    existing.total_quantity_canonical = computed.summary.total_quantity_canonical;
    existing.total_amount = computed.summary.total_amount;
    existing.unit_breakdown = computed.summary.unit_breakdown;
    existing.seller_breakdown = computed.summary.seller_breakdown;
    existing.status = "submitted";
    existing.submitted_by_id = actor.user_id;
    existing.submitted_at = new Date();
    if (notes !== undefined) existing.notes = notes ? notes.trim() : null;

    report = await existing.save();

    await SystemAuditLog.create({
      module: "GOLD_DAILY_REPORTS",
      action: "RESUBMIT",
      entity_id: report.report_id,
      entity_label: `${computed.purchasing_center.name} - ${computed.business_date}`,
      summary: `Resubmitted daily gold report for ${computed.business_date}: ${computed.summary.total_purchases} transactions, ${computed.summary.total_quantity_canonical}g`,
      previous_values: previousValues,
      new_values: report.toJSON(),
      changed_by: actor.user_id,
    }).catch((err) => console.error("Audit log error:", err.message));
  } else {
    report = await GoldDailyReport.create({
      purchasing_center_id: centerId,
      business_date: computed.business_date,
      total_purchases: computed.summary.total_purchases,
      total_quantity_canonical: computed.summary.total_quantity_canonical,
      total_amount: computed.summary.total_amount,
      unit_breakdown: computed.summary.unit_breakdown,
      seller_breakdown: computed.summary.seller_breakdown,
      status: "submitted",
      submitted_by_id: actor.user_id,
      submitted_at: new Date(),
      notes: notes ? notes.trim() : null,
    });

    await SystemAuditLog.create({
      module: "GOLD_DAILY_REPORTS",
      action: "SUBMIT",
      entity_id: report.report_id,
      entity_label: `${computed.purchasing_center.name} - ${computed.business_date}`,
      summary: `Submitted daily gold report for ${computed.business_date}: ${computed.summary.total_purchases} transactions, ${computed.summary.total_quantity_canonical}g`,
      new_values: report.toJSON(),
      changed_by: actor.user_id,
    }).catch((err) => console.error("Audit log error:", err.message));
  }

  return await getDailyReport(centerId, businessDate, actor);
}

/**
 * List historical daily reports with filtering and pagination.
 *
 * @param {Object} query - { purchasing_center_id, date_from, date_to, status, page, limit }
 * @param {Object} actor
 */
async function listHistoricalReports(query = {}, actor) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const where = {};

  if (actor?.is_purchasing_center) {
    where.purchasing_center_id = actor.purchasing_center_id;
  } else if (query.purchasing_center_id) {
    where.purchasing_center_id = query.purchasing_center_id;
  }

  if (query.date_from || query.date_to) {
    const range = {};
    if (query.date_from) range[Op.gte] = query.date_from;
    if (query.date_to) range[Op.lte] = query.date_to;
    where.business_date = range;
  }

  if (query.status && ["draft", "submitted", "reviewed"].includes(query.status)) {
    where.status = query.status;
  }

  const { rows, count } = await GoldDailyReport.findAndCountAll({
    where,
    include: [
      {
        model: PurchasingCenter,
        as: "purchasingCenter",
        attributes: ["purchasing_center_id", "name", "code", "description"],
      },
      {
        model: User,
        as: "submittedBy",
        attributes: ["user_id", "full_name", "email"],
      },
      {
        model: User,
        as: "reviewedBy",
        attributes: ["user_id", "full_name", "email"],
      },
    ],
    order: [["business_date", "DESC"]],
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

module.exports = {
  getDailyReport,
  submitDailyReport,
  listHistoricalReports,
};
