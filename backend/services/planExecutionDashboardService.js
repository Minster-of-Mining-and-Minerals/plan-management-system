"use strict";

const { Op } = require("sequelize");
const {
  PlanVersion,
  PlanNode,
  GovernmentStructure,
  InternalStructure,
} = require("../models");
const { resolveAccessibleMasterPlanIds } = require("./planVisibilityService");
const {
  computeMasterExecutionProgress,
  computePeriodExecutionProgress,
} = require("./planExecutionRollupService");
const { buildLiveToSnapshotVersionMap } = require("./planExecutionSnapshotService");
const { buildDepartmentAndUserMetrics } = require("./planExecutionAssignmentMetricsService");

function roundPercent(value) {
  if (value == null || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function deriveDashboardStatus(plan, progressPercent) {
  if (plan.status === "completed") return "completed";
  if (plan.process_started_at && progressPercent != null && progressPercent < 50) {
    return "delayed";
  }
  return "active";
}

function performanceLevel(percent) {
  if (percent == null) return "average";
  if (percent >= 85) return "excellent";
  if (percent >= 70) return "good";
  if (percent >= 50) return "average";
  return "at-risk";
}

async function enrichMasterPlanRow(master) {
  const plain = master.toJSON ? master.toJSON() : { ...master };
  let execution_progress_percent = null;
  let execution_annual_progress = [];
  let has_contributing_data = false;
  let active_planning_year = null;

  const progress = await computeMasterExecutionProgress(plain.plan_version_id);
  execution_progress_percent = progress.execution_progress_percent;
  execution_annual_progress = progress.execution_annual_progress ?? [];
  has_contributing_data = progress.has_contributing_data;
  active_planning_year = progress.active_planning_year ?? null;

  return {
    plan_version_id: plain.plan_version_id,
    draft_name: plain.draft_name,
    status: plain.status,
    government_structure_id: plain.government_structure_id,
    government_structure_name: plain.governmentStructure?.name ?? null,
    government_structure_code: plain.governmentStructure?.name?.slice(0, 12) ?? null,
    process_started_at: plain.process_started_at,
    execution_progress_percent,
    execution_annual_progress,
    has_contributing_data,
    active_planning_year,
    dashboard_status: deriveDashboardStatus(plain, execution_progress_percent),
    start_year: plain.start_year,
    end_year: plain.end_year,
    created_at: plain.created_at,
  };
}

async function resolveSnapshotMaster(liveMasterId) {
  const master = await PlanVersion.findByPk(liveMasterId);
  if (!master?.active_execution_snapshot_id) {
    return master;
  }

  const versionMap = await buildLiveToSnapshotVersionMap(master.active_execution_snapshot_id);
  return versionMap.get(liveMasterId) ?? master;
}

function classifyPeriodPhase(executionStatus) {
  if (executionStatus === "open") return "active";
  if (executionStatus === "completed") return "past";
  return "upcoming";
}

async function listPeriodsForMaster(liveMasterId) {
  const snapshotMaster = await resolveSnapshotMaster(liveMasterId);
  if (!snapshotMaster) {
    return [];
  }

  const annuals = await PlanVersion.findAll({
    where: {
      parent_plan_version_id: snapshotMaster.plan_version_id,
      version_kind: "annual",
    },
    order: [["sequence_index", "ASC"]],
  });

  const periods = [];
  for (const annual of annuals) {
    const annualPeriods = await PlanVersion.findAll({
      where: {
        parent_plan_version_id: annual.plan_version_id,
        version_kind: "execution_period",
      },
      order: [["sequence_index", "ASC"]],
    });

    for (const period of annualPeriods) {
      const plain = period.toJSON ? period.toJSON() : period;
      periods.push({
        plan_version_id: plain.plan_version_id,
        period_label: plain.period_label,
        planning_year: annual.planning_year ?? annual.year ?? null,
        sequence_index: plain.sequence_index ?? null,
        execution_status: plain.execution_status ?? null,
        phase: classifyPeriodPhase(plain.execution_status),
      });
    }
  }

  return periods;
}

function pickDefaultPeriod(periods) {
  if (!periods.length) return null;
  return (
    periods.find((period) => period.phase === "active") ??
    [...periods].reverse().find((period) => period.phase === "past") ??
    periods[0]
  );
}

async function resolveFocusPeriodForMaster(liveMasterId, requestedPeriodId = null) {
  const periods = await listPeriodsForMaster(liveMasterId);
  if (!periods.length) {
    return null;
  }

  const selectedMeta =
    (requestedPeriodId &&
      periods.find((period) => period.plan_version_id === requestedPeriodId)) ||
    pickDefaultPeriod(periods);

  if (!selectedMeta) {
    return null;
  }

  return PlanVersion.findByPk(selectedMeta.plan_version_id);
}

function mapNodeToDashboardTree(node, rollupMap, childrenByParent) {
  const metrics = rollupMap.get(node.plan_node_id);
  const progress = metrics?.has_contributing_data
    ? metrics.execution_progress_percent ?? 0
    : null;
  const children = (childrenByParent.get(node.plan_node_id) ?? [])
    .filter((child) => child.is_active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((child) => mapNodeToDashboardTree(child, rollupMap, childrenByParent));

  return {
    id: node.plan_node_id,
    title: node.title,
    sharingMode: node.assignment_sharing_mode === "shared" ? "shared" : "exclusive",
    progress: progress ?? 0,
    has_progress: metrics?.has_contributing_data ?? false,
    status:
      progress != null && progress < 50
        ? "delayed"
        : progress != null
          ? "active"
          : "active",
    children,
  };
}

async function buildProgressTreeForMaster(liveMasterId, requestedPeriodId = null) {
  const availablePeriods = await listPeriodsForMaster(liveMasterId);
  if (!availablePeriods.length) {
    return {
      period_label: null,
      planning_year: null,
      period_version_id: null,
      period_phase: null,
      available_periods: [],
      nodes: [],
    };
  }

  const selectedMeta =
    (requestedPeriodId &&
      availablePeriods.find((period) => period.plan_version_id === requestedPeriodId)) ||
    pickDefaultPeriod(availablePeriods);

  const period = selectedMeta
    ? await PlanVersion.findByPk(selectedMeta.plan_version_id)
    : null;

  if (!period || !selectedMeta) {
    return {
      period_label: null,
      planning_year: null,
      period_version_id: null,
      period_phase: null,
      available_periods: availablePeriods,
      nodes: [],
    };
  }

  const annual = await PlanVersion.findByPk(period.parent_plan_version_id);
  const nodes = await PlanNode.findAll({
    where: { plan_version_id: period.plan_version_id, is_active: true },
    order: [["level", "ASC"], ["order", "ASC"]],
  });

  const plainNodes = nodes.map((node) => (node.toJSON ? node.toJSON() : node));
  const { rollup_by_node_id } = await computePeriodExecutionProgress(period.plan_version_id);

  const childrenByParent = new Map();
  for (const node of plainNodes) {
    if (!node.parent_id) continue;
    const list = childrenByParent.get(node.parent_id) ?? [];
    list.push(node);
    childrenByParent.set(node.parent_id, list);
  }

  const roots = plainNodes
    .filter((node) => !node.parent_id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((node) => mapNodeToDashboardTree(node, rollup_by_node_id, childrenByParent));

  return {
    period_label: period.period_label,
    planning_year: annual?.planning_year ?? annual?.year ?? selectedMeta.planning_year,
    period_version_id: period.plan_version_id,
    period_phase: selectedMeta.phase,
    available_periods: availablePeriods,
    nodes: roots,
  };
}

async function buildSharingPlans(planRows, masterIds) {
  const roots = await PlanNode.findAll({
    where: {
      plan_version_id: { [Op.in]: masterIds },
      parent_id: null,
      is_active: true,
    },
    attributes: ["plan_node_id", "title", "assignment_sharing_mode", "plan_version_id"],
    order: [["order", "ASC"]],
  });

  const planById = new Map(planRows.map((plan) => [plan.plan_version_id, plan]));
  const shared = [];
  const exclusive = [];

  for (const root of roots) {
    const plan = planById.get(root.plan_version_id);
    if (!plan) continue;

    const entry = {
      id: root.plan_node_id,
      plan_version_id: plan.plan_version_id,
      title: root.title,
      progress: plan.execution_progress_percent ?? 0,
      status: plan.dashboard_status,
      structure_name: plan.government_structure_name,
    };

    if (root.assignment_sharing_mode === "shared") {
      shared.push({ ...entry, branches: 1 });
    } else {
      exclusive.push({ ...entry, target: plan.government_structure_name ?? "—" });
    }
  }

  return { shared, exclusive };
}

function buildAnnualTimeline(planRows) {
  const bucket = new Map();

  for (const plan of planRows) {
    if (!plan.process_started_at || !plan.execution_annual_progress?.length) continue;
    for (const annual of plan.execution_annual_progress) {
      const year = annual.planning_year ?? annual.sequence_index;
      if (year == null) continue;
      const key = String(year);
      const current = bucket.get(key) ?? { label: String(year), total: 0, count: 0 };
      const percent = annual.has_contributing_data
        ? annual.execution_progress_percent ?? 0
        : 0;
      current.total += percent;
      current.count += 1;
      bucket.set(key, current);
    }
  }

  return Array.from(bucket.values())
    .map((entry) => ({
      label: entry.label,
      average_percent: entry.count > 0 ? roundPercent(entry.total / entry.count) : 0,
      plan_count: entry.count,
    }))
    .sort((a, b) => Number(a.label) - Number(b.label));
}

async function buildStructureMetrics(planRows) {
  const grouped = new Map();

  for (const plan of planRows) {
    const structureId = plan.government_structure_id;
    if (!structureId) continue;
    const current = grouped.get(structureId) ?? {
      id: structureId,
      name: plan.government_structure_name ?? "Unknown",
      code: plan.government_structure_code ?? plan.government_structure_name?.slice(0, 12) ?? "—",
      totalPlans: 0,
      inExecutionPlans: 0,
      progressTotal: 0,
      progressCount: 0,
    };
    current.totalPlans += 1;
    if (plan.process_started_at) {
      current.inExecutionPlans += 1;
    }
    if (plan.execution_progress_percent != null) {
      current.progressTotal += plan.execution_progress_percent;
      current.progressCount += 1;
    }
    grouped.set(structureId, current);
  }

  const structureIds = Array.from(grouped.keys());
  const internalStructures = structureIds.length
    ? await InternalStructure.findAll({
        where: {
          government_structure_id: { [Op.in]: structureIds },
          is_active: true,
        },
        attributes: ["internal_structure_id", "name", "government_structure_id"],
      })
    : [];

  const departmentsByStructure = new Map();
  for (const dept of internalStructures) {
    const list = departmentsByStructure.get(dept.government_structure_id) ?? [];
    list.push(dept);
    departmentsByStructure.set(dept.government_structure_id, list);
  }

  return Array.from(grouped.values()).map((structure) => {
    const completionPercent =
      structure.progressCount > 0
        ? roundPercent(structure.progressTotal / structure.progressCount)
        : 0;
    const depts = departmentsByStructure.get(structure.id) ?? [];
    return {
      id: structure.id,
      name: structure.name,
      code: structure.code,
      totalPlans: structure.totalPlans,
      completionPercent,
      activeDepartments: depts.length,
      performance: performanceLevel(completionPercent),
      departmentIds: depts.map((d) => d.internal_structure_id),
    };
  });
}

async function collectFocusPeriodContexts(planRows) {
  const contexts = [];

  for (const plan of planRows) {
    if (!plan.process_started_at) continue;
    const period = await resolveFocusPeriodForMaster(plan.plan_version_id);
    if (!period) continue;
    contexts.push({
      liveMasterPlanId: plan.plan_version_id,
      periodVersionId: period.plan_version_id,
      structureId: plan.government_structure_id,
    });
  }

  return contexts;
}

async function getPlanExecutionDashboard(req, query = {}) {
  const accessibleMasterIds = await resolveAccessibleMasterPlanIds(req);
  if (accessibleMasterIds !== null && accessibleMasterIds.length === 0) {
    return emptyDashboard();
  }

  const where = {
    version_kind: "master",
    review_snapshot_of_version_id: null,
    execution_snapshot_of_version_id: null,
  };

  if (accessibleMasterIds !== null) {
    where.plan_version_id = { [Op.in]: accessibleMasterIds };
  }
  if (query.government_structure_id) {
    where.government_structure_id = query.government_structure_id;
  }
  if (query.status === "completed") {
    where.status = "completed";
  }
  if (query.search?.trim()) {
    where.draft_name = { [Op.iLike]: `%${query.search.trim()}%` };
  }
  if (query.date_from || query.date_to) {
    where.created_at = {};
    if (query.date_from) {
      where.created_at[Op.gte] = new Date(query.date_from);
    }
    if (query.date_to) {
      where.created_at[Op.lte] = new Date(`${query.date_to}T23:59:59.999Z`);
    }
  }

  const masters = await PlanVersion.findAll({
    where,
    include: [
      {
        model: GovernmentStructure,
        as: "governmentStructure",
        attributes: ["government_structure_id", "name"],
      },
    ],
    order: [["start_year", "DESC"], ["version_number", "DESC"]],
  });

  let planRows = [];
  for (const master of masters) {
    planRows.push(await enrichMasterPlanRow(master));
  }

  if (query.status === "delayed") {
    planRows = planRows.filter((plan) => plan.dashboard_status === "delayed");
  } else if (query.status === "active") {
    planRows = planRows.filter(
      (plan) => plan.dashboard_status === "active" || plan.process_started_at
    );
  }

  if (query.sharing_mode && query.sharing_mode !== "all") {
    const masterIds = planRows.map((plan) => plan.plan_version_id);
    const roots = await PlanNode.findAll({
      where: {
        plan_version_id: { [Op.in]: masterIds },
        parent_id: null,
        is_active: true,
        assignment_sharing_mode: query.sharing_mode,
      },
      attributes: ["plan_version_id"],
    });
    const allowed = new Set(roots.map((root) => root.plan_version_id));
    planRows = planRows.filter((plan) => allowed.has(plan.plan_version_id));
  }

  const masterIds = planRows.map((plan) => plan.plan_version_id);
  const progressValues = planRows
    .map((plan) => plan.execution_progress_percent)
    .filter((value) => value != null);
  const sharingRoots = await PlanNode.findAll({
    where: {
      plan_version_id: { [Op.in]: masterIds },
      parent_id: null,
      is_active: true,
    },
    attributes: ["assignment_sharing_mode"],
  });

  const kpi = {
    totalPlans: planRows.length,
    activePlans: planRows.filter((plan) => plan.process_started_at).length,
    completedPlans: planRows.filter((plan) => plan.status === "completed").length,
    inExecutionPlans: planRows.filter((plan) => plan.process_started_at).length,
    sharedPlans: sharingRoots.filter((node) => node.assignment_sharing_mode === "shared")
      .length,
    exclusivePlans: sharingRoots.filter(
      (node) => node.assignment_sharing_mode !== "shared"
    ).length,
    averageProgress:
      progressValues.length > 0
        ? roundPercent(
            progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length
          )
        : null,
  };

  const structures = await buildStructureMetrics(planRows);
  const focusContexts = await collectFocusPeriodContexts(planRows);
  const { departments, users } = await buildDepartmentAndUserMetrics(focusContexts, structures);
  const annualTimeline = buildAnnualTimeline(planRows);
  const sharing = await buildSharingPlans(planRows, masterIds);

  const focusMasterId =
    query.master_plan_version_id &&
    planRows.some((plan) => plan.plan_version_id === query.master_plan_version_id)
      ? query.master_plan_version_id
      : planRows.find((plan) => plan.process_started_at)?.plan_version_id ?? planRows[0]?.plan_version_id ?? null;

  const progressTree = focusMasterId
    ? await buildProgressTreeForMaster(focusMasterId, query.period_version_id || null)
    : {
        period_label: null,
        planning_year: null,
        period_version_id: null,
        period_phase: null,
        available_periods: [],
        nodes: [],
      };

  return {
    kpi,
    plans: planRows,
    structures,
    departments,
    users,
    annual_timeline: annualTimeline,
    sharing,
    progress_tree: progressTree,
    focus_master_plan_version_id: focusMasterId,
    generated_at: new Date().toISOString(),
  };
}

function emptyDashboard() {
  return {
    kpi: {
      totalPlans: 0,
      activePlans: 0,
      completedPlans: 0,
      inExecutionPlans: 0,
      sharedPlans: 0,
      exclusivePlans: 0,
      averageProgress: null,
    },
    plans: [],
    structures: [],
    departments: [],
    users: [],
    annual_timeline: [],
    sharing: { shared: [], exclusive: [] },
    progress_tree: {
      period_label: null,
      planning_year: null,
      period_version_id: null,
      period_phase: null,
      available_periods: [],
      nodes: [],
    },
    focus_master_plan_version_id: null,
    generated_at: new Date().toISOString(),
  };
}

module.exports = {
  getPlanExecutionDashboard,
  buildProgressTreeForMaster,
};
