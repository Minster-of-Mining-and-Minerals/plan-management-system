"use strict";

/**
 * Debug period achievement rollup for a plan.
 * Usage: node scripts/debug-period-achievement.js [--version-id <uuid>] [--search "partial name"]
 */
require("dotenv").config();
const { Op } = require("sequelize");
const db = require("../models");
const { PlanVersion, PlanNode, GovernmentStructure } = db;
const { resolvePlanRuleForVersion } = require("../services/planRuleService");
const {
  computePeriodExecutionProgress,
  computeRollupMap,
} = require("../services/planExecutionRollupService");
const { stepRequiresWeight } = require("../services/planRuleStepUtils");
const { usesManualAchievementForRollup } = require("../services/planExecutionAchievementUtils");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { versionId: null, search: null, periodLabel: "Q1" };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--version-id") out.versionId = args[++i];
    if (args[i] === "--search") out.search = args[++i];
    if (args[i] === "--period") out.periodLabel = args[++i];
  }
  return out;
}

function indent(level) {
  return "  ".repeat(level);
}

function printNodeTree(node, childrenByParent, rollupMap, rule, level = 0) {
  const children = (childrenByParent.get(node.plan_node_id) ?? [])
    .filter((c) => c.is_active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const metrics = rollupMap.get(node.plan_node_id) ?? {};
  const manual = usesManualAchievementForRollup(node, childrenByParent);
  const weighted = stepRequiresWeight(rule, node.level);
  const leafActual =
    node.period_actual != null && node.period_actual !== undefined
      ? Number(node.period_actual)
      : null;
  const leafTarget = Number(node.period_target) || 0;
  const leafPct =
    leafActual != null && leafTarget > 0
      ? Math.round((leafActual / leafTarget) * 100)
      : null;

  const parts = [
    `${indent(level)}${node.title || node.name || "(untitled)"}`,
    `[level ${node.level}]`,
    weighted ? "weighted" : "org",
    manual ? "manual/leaf" : "rollup",
  ];

  if (leafTarget > 0) {
    parts.push(`leaf ${leafActual ?? "—"}/${leafTarget} (${leafPct ?? 0}%)`);
  }

  if (metrics.computed_period_target != null) {
    parts.push(
      `rollup ${metrics.computed_period_actual ?? 0}/${metrics.computed_period_target} => ${metrics.execution_progress_percent ?? "—"}%`
    );
  }

  if (node.period_actual_override) {
    parts.push("[parent override]");
  }

  console.log(parts.join(" | "));

  for (const child of children) {
    printNodeTree(child, childrenByParent, rollupMap, rule, level + 1);
  }
}

async function findPeriodVersion({ versionId, search, periodLabel }) {
  if (versionId) {
    const version = await PlanVersion.findByPk(versionId);
    if (!version) throw new Error(`Version not found: ${versionId}`);
    return version;
  }

  const masters = await PlanVersion.findAll({
    where: {
      version_kind: "master",
      draft_name: search ? { [Op.iLike]: `%${search}%` } : { [Op.ne]: null },
    },
    order: [["updated_at", "DESC"]],
    limit: 10,
  });

  if (masters.length === 0) {
    throw new Error(`No master plan matching search: ${search}`);
  }

  for (const master of masters) {
    const snapshotId = master.active_execution_snapshot_id || master.plan_version_id;
    const annuals = await PlanVersion.findAll({
      where: { parent_plan_version_id: snapshotId, version_kind: "annual" },
      order: [["sequence_index", "ASC"]],
    });

    for (const annual of annuals) {
      const periods = await PlanVersion.findAll({
        where: { parent_plan_version_id: annual.plan_version_id, version_kind: "execution_period" },
        order: [["sequence_index", "ASC"]],
      });

      const period = periods.find(
        (p) =>
          (p.period_label || "").toLowerCase() === periodLabel.toLowerCase() ||
          String(p.sequence_index) === String(periodLabel)
      );

      if (period) {
        return { period, annual, master };
      }
    }
  }

  throw new Error(`No ${periodLabel} period found for matching plans`);
}

async function main() {
  const opts = parseArgs();
  const search =
    opts.search ||
    process.env.DEBUG_PLAN_SEARCH ||
    "2019";

  const found = await findPeriodVersion(opts);
  const period = found.period || found;
  const annual = found.annual;
  const master = found.master;

  const structure = master?.government_structure_id
    ? await GovernmentStructure.findByPk(master.government_structure_id)
    : null;

  console.log("\n=== Plan context ===");
  if (master) {
    console.log(`Master: ${master.draft_name}`);
    console.log(`Structure: ${structure?.name ?? master.government_structure_id}`);
    console.log(`Master ID: ${master.plan_version_id}`);
  }
  if (annual) {
    console.log(`Annual: Year ${annual.planning_year ?? annual.year} (${annual.plan_version_id})`);
  }
  console.log(`Period: ${period.period_label} (${period.plan_version_id})`);
  console.log(`Status: ${period.execution_status} / planning ${period.status}`);
  console.log(
    `Dates: ${period.planning_period_start ?? "—"} → ${period.planning_period_end ?? "—"}`
  );

  const rule = await resolvePlanRuleForVersion(period);
  console.log(`Rule steps: ${rule?.steps?.length ?? 0} levels`);

  const nodes = await PlanNode.findAll({
    where: { plan_version_id: period.plan_version_id, is_active: true },
    order: [
      ["level", "ASC"],
      ["order", "ASC"],
    ],
  });

  const plainNodes = nodes.map((n) => (n.toJSON ? n.toJSON() : n));
  const progress = await computePeriodExecutionProgress(period.plan_version_id);
  const rollupMap = progress.rollup_by_node_id;

  const childrenByParent = new Map();
  for (const node of plainNodes) {
    if (!node.parent_id) continue;
    const list = childrenByParent.get(node.parent_id) ?? [];
    list.push(node);
    childrenByParent.set(node.parent_id, list);
  }

  const roots = plainNodes
    .filter((n) => !n.parent_id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  console.log("\n=== Period achievement (what UI shows) ===");
  console.log(
    `execution_progress_percent: ${progress.execution_progress_percent}%`
  );
  console.log(
    `computed actual/target: ${progress.computed_period_actual} / ${progress.computed_period_target}`
  );
  if (progress.computed_period_target > 0) {
    const derived = Math.round(
      (progress.computed_period_actual / progress.computed_period_target) * 100
    );
    console.log(`derived from Σactual/Σtarget: ${derived}%`);
  }

  const kpiLeaves = plainNodes.filter((n) => {
    const kids = childrenByParent.get(n.plan_node_id) ?? [];
    return kids.length === 0 && Number(n.period_target) > 0;
  });

  console.log("\n=== KPI / leaf targets (reporting units) ===");
  let sumActual = 0;
  let sumTarget = 0;
  let reported = 0;
  for (const leaf of kpiLeaves) {
    const actual =
      leaf.period_actual != null && leaf.period_actual !== undefined
        ? Number(leaf.period_actual)
        : null;
    const target = Number(leaf.period_target) || 0;
    const pct = actual != null && target > 0 ? Math.round((actual / target) * 100) : 0;
    if (actual != null) reported += 1;
    sumActual += actual ?? 0;
    sumTarget += target;
    console.log(
      `  ${leaf.title || leaf.name}: ${actual ?? "NOT REPORTED"}/${target} => ${actual != null ? pct + "%" : "counts as 0%"}`
    );
  }
  console.log(`Leaves with targets: ${kpiLeaves.length}, reported: ${reported}`);
  console.log(`Σ leaf actual/target: ${sumActual}/${sumTarget} => ${sumTarget > 0 ? Math.round((sumActual / sumTarget) * 100) : "—"}%`);

  console.log("\n=== Rollup tree (bottom-up) ===");
  for (const root of roots) {
    printNodeTree(root, childrenByParent, rollupMap, rule, 0);
  }

  console.log("\n=== How 74% is produced ===");
  console.log(
    "Period % = Σ(root computed_actual) / Σ(root computed_target) across all strategic roots."
  );
  console.log(
    "Each parent sums ALL sibling children with period targets; unreported leaves count as actual=0."
  );
  console.log(
    "Org levels (e.g. SF) use the same sum rule, not an average of child percentages."
  );

  await db.sequelize.close();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await db.sequelize.close();
  } catch (_) {}
  process.exit(1);
});
