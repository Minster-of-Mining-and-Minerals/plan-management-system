"use strict";

const { Op, fn, col, literal } = require("sequelize");
const {
  sequelize,
  GoldPurchase,
  GoldDailyReport,
  PurchasingCenter,
  GoldMeasurementUnit,
  Company,
  AsmMiner,
} = require("../models");
const { getTodayBusinessDate } = require("./goldPurchaseService");

/**
 * Get purchasing-center scoped gold purchasing dashboard metrics.
 *
 * @param {string} centerId
 * @param {Object} query - { date_from, date_to }
 * @param {Object} actor
 */
async function getPurchasingCenterDashboard(centerId, query = {}, actor) {
  // Scope isolation check
  if (actor?.is_purchasing_center && centerId !== actor.purchasing_center_id) {
    const error = new Error("Access denied: cannot view dashboard for a different purchasing center.");
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

  const today = getTodayBusinessDate();

  // Period where clause
  const periodWhere = {
    purchasing_center_id: centerId,
    status: "completed",
  };

  const selectedTimeRange = query.time_range || "all";
  if (query.time_range && query.time_range !== "all") {
    const todayDate = new Date();
    let days = 0;
    if (query.time_range === "7d") days = 7;
    else if (query.time_range === "30d") days = 30;
    else if (query.time_range === "90d") days = 90;

    if (query.time_range === "today") {
      periodWhere.business_date = today;
    } else if (days > 0) {
      const past = new Date(todayDate);
      past.setDate(past.getDate() - days);
      const pastStr = past.toISOString().slice(0, 10);
      periodWhere.business_date = { [Op.gte]: pastStr, [Op.lte]: today };
    }
  } else if (query.date_from || query.date_to) {
    const dateRange = {};
    if (query.date_from) dateRange[Op.gte] = query.date_from;
    if (query.date_to) dateRange[Op.lte] = query.date_to;
    periodWhere.business_date = dateRange;
  }

  // 1. Fetch all completed purchases in the selected period for aggregate metrics & breakdowns
  const [periodPurchases, todayPurchases, todayReport, recentPurchases] = await Promise.all([
    GoldPurchase.findAll({
      where: periodWhere,
      attributes: [
        "purchase_id",
        "business_date",
        "quantity",
        "quantity_in_canonical_unit",
        "unit_code_snapshot",
        "measurement_unit_id",
        "unit_price",
        "total_amount",
        "seller_type",
        "seller_name_snapshot",
        "seller_identifier_snapshot",
        "company_id",
        "asm_id",
        "gold_type",
        "karat",
        "quality_grade",
        "is_custom_price",
      ],
      include: [
        {
          model: GoldMeasurementUnit,
          as: "measurementUnit",
          attributes: ["name", "symbol", "code"],
        },
        {
          model: Company,
          as: "companySeller",
          attributes: ["company_id", "name", "code"],
        },
        {
          model: AsmMiner,
          as: "asmSeller",
          attributes: ["asm_id", "full_name", "national_id_number"],
        },
      ],
      order: [["business_date", "ASC"]],
    }),

    // Today's purchases
    GoldPurchase.findAll({
      where: {
        purchasing_center_id: centerId,
        business_date: today,
        status: "completed",
      },
      attributes: [
        "purchase_id",
        "quantity",
        "quantity_in_canonical_unit",
        "total_amount",
        "seller_type",
      ],
    }),

    // Today's daily report submission
    GoldDailyReport.findOne({
      where: {
        purchasing_center_id: centerId,
        business_date: today,
      },
      attributes: ["report_id", "status", "submitted_at"],
    }),

    // Recent 5 purchases
    GoldPurchase.findAll({
      where: {
        purchasing_center_id: centerId,
      },
      include: [
        {
          model: GoldMeasurementUnit,
          as: "measurementUnit",
          attributes: ["name", "symbol", "code"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 10,
    }),
  ]);

  // Compute period aggregates
  let totalPeriodQuantityCanonical = 0;
  let totalPeriodAmount = 0;
  const unitMap = new Map();
  const companyBreakdownMap = new Map();
  const asmBreakdownMap = new Map();
  const karatBreakdownMap = new Map();
  const qualityBreakdownMap = new Map();
  const distinctCompanies = new Set();
  const distinctAsms = new Set();
  const trendMap = new Map();

  const sellerDistribution = {
    company: { count: 0, canonical_quantity: 0, amount: 0 },
    asm: { count: 0, canonical_quantity: 0, amount: 0 },
  };

  for (const p of periodPurchases) {
    const qty = parseFloat(p.quantity) || 0;
    const canonical = parseFloat(p.quantity_in_canonical_unit) || 0;
    const amount = parseFloat(p.total_amount) || 0;
    const bDate = p.business_date;

    totalPeriodQuantityCanonical += canonical;
    totalPeriodAmount += amount;

    if (p.seller_type === "company") {
      const compId = p.company_id || p.seller_name_snapshot;
      if (p.company_id) distinctCompanies.add(p.company_id);
      sellerDistribution.company.count += 1;
      sellerDistribution.company.canonical_quantity += canonical;
      sellerDistribution.company.amount += amount;

      if (!companyBreakdownMap.has(compId)) {
        companyBreakdownMap.set(compId, {
          company_id: p.company_id || null,
          name: p.companySeller?.name || p.seller_name_snapshot || "Corporate Seller",
          code: p.companySeller?.code || "COMP",
          purchases_count: 0,
          canonical_quantity: 0,
          total_amount: 0,
        });
      }
      const cEntry = companyBreakdownMap.get(compId);
      cEntry.purchases_count += 1;
      cEntry.canonical_quantity = parseFloat((cEntry.canonical_quantity + canonical).toFixed(4));
      cEntry.total_amount = parseFloat((cEntry.total_amount + amount).toFixed(2));
    } else if (p.seller_type === "asm") {
      const asmKey = p.asm_id || p.seller_name_snapshot;
      if (p.asm_id) distinctAsms.add(p.asm_id);
      sellerDistribution.asm.count += 1;
      sellerDistribution.asm.canonical_quantity += canonical;
      sellerDistribution.asm.amount += amount;

      if (!asmBreakdownMap.has(asmKey)) {
        asmBreakdownMap.set(asmKey, {
          asm_id: p.asm_id || null,
          full_name: p.asmSeller?.full_name || p.seller_name_snapshot || "Artisanal Miner",
          identifier: p.asmSeller?.national_id_number || p.seller_identifier_snapshot || "N/A",
          purchases_count: 0,
          canonical_quantity: 0,
          total_amount: 0,
        });
      }
      const aEntry = asmBreakdownMap.get(asmKey);
      aEntry.purchases_count += 1;
      aEntry.canonical_quantity = parseFloat((aEntry.canonical_quantity + canonical).toFixed(4));
      aEntry.total_amount = parseFloat((aEntry.total_amount + amount).toFixed(2));
    }

    // Karat breakdown
    const karatKey = p.karat || "Standard/Raw";
    if (!karatBreakdownMap.has(karatKey)) {
      karatBreakdownMap.set(karatKey, {
        karat: karatKey,
        purchases_count: 0,
        canonical_quantity: 0,
        total_amount: 0,
      });
    }
    const kEntry = karatBreakdownMap.get(karatKey);
    kEntry.purchases_count += 1;
    kEntry.canonical_quantity = parseFloat((kEntry.canonical_quantity + canonical).toFixed(4));
    kEntry.total_amount = parseFloat((kEntry.total_amount + amount).toFixed(2));

    // Quality grade breakdown
    const qualityKey = p.quality_grade || "Standard Grade";
    if (!qualityBreakdownMap.has(qualityKey)) {
      qualityBreakdownMap.set(qualityKey, {
        quality_grade: qualityKey,
        purchases_count: 0,
        canonical_quantity: 0,
        total_amount: 0,
      });
    }
    const qEntry = qualityBreakdownMap.get(qualityKey);
    qEntry.purchases_count += 1;
    qEntry.canonical_quantity = parseFloat((qEntry.canonical_quantity + canonical).toFixed(4));
    qEntry.total_amount = parseFloat((qEntry.total_amount + amount).toFixed(2));

    // Unit breakdown
    const unitCode = p.unit_code_snapshot || p.measurementUnit?.code || "unknown";
    if (!unitMap.has(unitCode)) {
      unitMap.set(unitCode, {
        code: unitCode,
        name: p.measurementUnit?.name || unitCode,
        symbol: p.measurementUnit?.symbol || unitCode,
        total_quantity: 0,
        purchase_count: 0,
      });
    }
    const uEntry = unitMap.get(unitCode);
    uEntry.total_quantity = parseFloat((uEntry.total_quantity + qty).toFixed(4));
    uEntry.purchase_count += 1;

    // Daily trend
    if (!trendMap.has(bDate)) {
      trendMap.set(bDate, {
        date: bDate,
        count: 0,
        canonical_quantity: 0,
        amount: 0,
        company_quantity: 0,
        asm_quantity: 0,
      });
    }
    const tEntry = trendMap.get(bDate);
    tEntry.count += 1;
    tEntry.canonical_quantity = parseFloat((tEntry.canonical_quantity + canonical).toFixed(4));
    tEntry.amount = parseFloat((tEntry.amount + amount).toFixed(2));
    if (p.seller_type === "company") {
      tEntry.company_quantity = parseFloat((tEntry.company_quantity + canonical).toFixed(4));
    } else {
      tEntry.asm_quantity = parseFloat((tEntry.asm_quantity + canonical).toFixed(4));
    }
  }

  // Today aggregates
  let todayCanonicalQuantity = 0;
  let todayAmount = 0;
  for (const p of todayPurchases) {
    todayCanonicalQuantity += parseFloat(p.quantity_in_canonical_unit) || 0;
    todayAmount += parseFloat(p.total_amount) || 0;
  }

  const distinctSellersTotal = distinctCompanies.size + distinctAsms.size;

  let reportStatus = "no_activity";
  if (todayPurchases.length > 0) {
    reportStatus = todayReport ? todayReport.status : "unsubmitted";
  } else if (todayReport) {
    reportStatus = todayReport.status;
  }

  return {
    purchasing_center: center,
    time_range: selectedTimeRange,
    today: {
      business_date: today,
      purchases_count: todayPurchases.length,
      canonical_quantity: parseFloat(todayCanonicalQuantity.toFixed(4)),
      amount: parseFloat(todayAmount.toFixed(2)),
      report_status: reportStatus,
      submitted_at: todayReport?.submitted_at || null,
    },
    period_summary: {
      total_purchases: periodPurchases.length,
      total_canonical_quantity: parseFloat(totalPeriodQuantityCanonical.toFixed(4)),
      total_amount: parseFloat(totalPeriodAmount.toFixed(2)),
      currency: "ETB",
      distinct_sellers: {
        total: distinctSellersTotal,
        companies: distinctCompanies.size,
        asm: distinctAsms.size,
      },
      unit_breakdown: Array.from(unitMap.values()),
      seller_distribution: {
        company: {
          count: sellerDistribution.company.count,
          canonical_quantity: parseFloat(sellerDistribution.company.canonical_quantity.toFixed(4)),
          amount: parseFloat(sellerDistribution.company.amount.toFixed(2)),
        },
        asm: {
          count: sellerDistribution.asm.count,
          canonical_quantity: parseFloat(sellerDistribution.asm.canonical_quantity.toFixed(4)),
          amount: parseFloat(sellerDistribution.asm.amount.toFixed(2)),
        },
      },
      company_breakdown: Array.from(companyBreakdownMap.values())
        .map((c) => ({
          ...c,
          count: c.purchases_count,
          amount: c.total_amount,
        }))
        .sort((a, b) => b.canonical_quantity - a.canonical_quantity),
      asm_breakdown: Array.from(asmBreakdownMap.values())
        .map((a) => ({
          ...a,
          count: a.purchases_count,
          amount: a.total_amount,
        }))
        .sort((a, b) => b.canonical_quantity - a.canonical_quantity),
      karat_breakdown: Array.from(karatBreakdownMap.values()).sort(
        (a, b) => b.canonical_quantity - a.canonical_quantity
      ),
      quality_breakdown: Array.from(qualityBreakdownMap.values()).sort(
        (a, b) => b.canonical_quantity - a.canonical_quantity
      ),
    },
    daily_trends: Array.from(trendMap.values()),
    recent_purchases: recentPurchases,
  };
}

/**
 * Get centralized federal oversight dashboard data across all purchasing centers.
 *
 * @param {Object} query - { business_date, date_from, date_to }
 */
async function getFederalOversightDashboard(query = {}) {
  const today = query.business_date || getTodayBusinessDate();

  // 1. Purchasing centers count
  const [totalCenters, activeCenters] = await Promise.all([
    PurchasingCenter.count(),
    PurchasingCenter.count({ where: { is_active: true } }),
  ]);

  // 2. All-time completed purchases aggregates
  const allPurchases = await GoldPurchase.findAll({
    where: { status: "completed" },
    attributes: [
      "purchasing_center_id",
      "quantity_in_canonical_unit",
      "total_amount",
      "seller_type",
      "business_date",
    ],
  });

  let totalCanonicalQuantity = 0;
  let totalAmount = 0;
  let companyCount = 0;
  let companyQuantity = 0;
  let companyAmount = 0;
  let asmCount = 0;
  let asmQuantity = 0;
  let asmAmount = 0;

  let todayPurchasesCount = 0;
  let todayCanonicalQuantity = 0;
  let todayAmount = 0;

  // Center-level aggregates map
  const centerAggMap = new Map();

  for (const p of allPurchases) {
    const canonical = parseFloat(p.quantity_in_canonical_unit) || 0;
    const amt = parseFloat(p.total_amount) || 0;

    totalCanonicalQuantity += canonical;
    totalAmount += amt;

    if (p.seller_type === "company") {
      companyCount += 1;
      companyQuantity += canonical;
      companyAmount += amt;
    } else {
      asmCount += 1;
      asmQuantity += canonical;
      asmAmount += amt;
    }

    if (p.business_date === today) {
      todayPurchasesCount += 1;
      todayCanonicalQuantity += canonical;
      todayAmount += amt;
    }

    const pcId = p.purchasing_center_id;
    if (!centerAggMap.has(pcId)) {
      centerAggMap.set(pcId, {
        purchases_count: 0,
        canonical_quantity: 0,
        total_amount: 0,
        today_purchases_count: 0,
        today_canonical_quantity: 0,
        today_amount: 0,
      });
    }
    const cEntry = centerAggMap.get(pcId);
    cEntry.purchases_count += 1;
    cEntry.canonical_quantity = parseFloat((cEntry.canonical_quantity + canonical).toFixed(4));
    cEntry.total_amount = parseFloat((cEntry.total_amount + amt).toFixed(2));

    if (p.business_date === today) {
      cEntry.today_purchases_count += 1;
      cEntry.today_canonical_quantity = parseFloat((cEntry.today_canonical_quantity + canonical).toFixed(4));
      cEntry.today_amount = parseFloat((cEntry.today_amount + amt).toFixed(2));
    }
  }

  // 3. Today's submitted daily reports across centers
  const reportsToday = await GoldDailyReport.findAll({
    where: { business_date: today },
    attributes: ["purchasing_center_id", "status", "submitted_at"],
  });
  const reportsMap = new Map();
  for (const r of reportsToday) {
    reportsMap.set(r.purchasing_center_id, r);
  }

  // 4. Center list with enriched statistics
  const centers = await PurchasingCenter.findAll({
    attributes: ["purchasing_center_id", "name", "code", "description", "is_active"],
    order: [["name", "ASC"]],
  });

  let submittedReportsCount = 0;
  const centerSummaries = centers.map((c) => {
    const agg = centerAggMap.get(c.purchasing_center_id) || {
      purchases_count: 0,
      canonical_quantity: 0,
      total_amount: 0,
      today_purchases_count: 0,
      today_canonical_quantity: 0,
      today_amount: 0,
    };
    const rep = reportsMap.get(c.purchasing_center_id);
    let todayReportStatus = "no_activity";
    if (agg.today_purchases_count > 0) {
      todayReportStatus = rep ? rep.status : "unsubmitted";
    } else if (rep) {
      todayReportStatus = rep.status;
    }

    if (rep && (rep.status === "submitted" || rep.status === "reviewed")) {
      submittedReportsCount += 1;
    }

    return {
      purchasing_center_id: c.purchasing_center_id,
      name: c.name,
      code: c.code,
      location: c.location,
      is_active: c.is_active,
      total_purchases: agg.purchases_count,
      total_quantity_canonical: agg.canonical_quantity,
      total_amount: agg.total_amount,
      today_purchases: agg.today_purchases_count,
      today_quantity_canonical: agg.today_canonical_quantity,
      today_amount: agg.today_amount,
      today_report_status: todayReportStatus,
      today_report_submitted_at: rep?.submitted_at || null,
    };
  });

  const reportingCompletionRate = activeCenters > 0
    ? parseFloat(((submittedReportsCount / activeCenters) * 100).toFixed(1))
    : 0;

  // 5. Recent 10 purchases across all centers
  const recentPurchases = await GoldPurchase.findAll({
    include: [
      {
        model: PurchasingCenter,
        as: "purchasingCenter",
        attributes: ["purchasing_center_id", "name", "code"],
      },
      {
        model: GoldMeasurementUnit,
        as: "measurementUnit",
        attributes: ["name", "symbol", "code"],
      },
    ],
    order: [["created_at", "DESC"]],
    limit: 10,
  });

  return {
    overview: {
      total_centers: totalCenters,
      active_centers: activeCenters,
      inactive_centers: totalCenters - activeCenters,
      total_purchases: allPurchases.length,
      total_quantity_canonical: parseFloat(totalCanonicalQuantity.toFixed(4)),
      total_amount: parseFloat(totalAmount.toFixed(2)),
      currency: "ETB",
    },
    today: {
      business_date: today,
      purchases_count: todayPurchasesCount,
      canonical_quantity: parseFloat(todayCanonicalQuantity.toFixed(4)),
      amount: parseFloat(todayAmount.toFixed(2)),
      submitted_reports_count: submittedReportsCount,
      reporting_completion_rate: reportingCompletionRate,
    },
    seller_distribution: {
      company: {
        count: companyCount,
        canonical_quantity: parseFloat(companyQuantity.toFixed(4)),
        amount: parseFloat(companyAmount.toFixed(2)),
      },
      asm: {
        count: asmCount,
        canonical_quantity: parseFloat(asmQuantity.toFixed(4)),
        amount: parseFloat(asmAmount.toFixed(2)),
      },
    },
    centers: centerSummaries,
    recent_purchases: recentPurchases,
  };
}

module.exports = {
  getPurchasingCenterDashboard,
  getFederalOversightDashboard,
};
