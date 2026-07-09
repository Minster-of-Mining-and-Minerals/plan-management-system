"use strict";

const {
  resolveEffectivePlanningConfig,
  buildPlanningConfigResponse,
  updateGlobalPlanningConfig,
  upsertSectorPlanningConfig,
  restoreGlobalPlanningConfig,
  restoreSectorPlanningConfig,
  applyPlanningConfigUpdates,
} = require("../../services/planningConfigurationService");
const { PlanVersion, PlanningConfiguration, sequelize } = require("../../models");
const { resolveMasterPlanVersionForConfig } = require("../../utils/planVersionHierarchyUtils");
const { buildPlanningConfigResponseForVersion } = require("../../services/planVersionSnapshotService");
const { loadGovernmentStructureIndex } = require("../../services/planVisibilityService");
const {
  isSuperAdminActor,
  resolveManageableStructureId,
  sendScopeError,
} = require("../../utils/structureScopeUtils");

function getQuery(req) {
  return req.validatedQuery ?? req.query;
}

function parseOptionalStructureId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value);
}

async function resolveReadStructureId(req) {
  const requestedId = parseOptionalStructureId(getQuery(req).government_structure_id);

  if (isSuperAdminActor(req)) {
    return requestedId;
  }

  const structureIndex = await loadGovernmentStructureIndex();
  if (requestedId) {
    return resolveManageableStructureId(req, requestedId, structureIndex);
  }

  return resolveManageableStructureId(req, null, structureIndex);
}

async function resolveWriteTarget(req) {
  const hasBodyField = Object.prototype.hasOwnProperty.call(
    req.body || {},
    "government_structure_id"
  );
  const requestedId = hasBodyField
    ? parseOptionalStructureId(req.body.government_structure_id)
    : undefined;

  if (requestedId === undefined) {
    if (isSuperAdminActor(req)) {
      return { scope: "global", government_structure_id: null };
    }

    const structureIndex = await loadGovernmentStructureIndex();
    const structureId = resolveManageableStructureId(req, null, structureIndex);
    return { scope: "sector", government_structure_id: structureId };
  }

  if (requestedId === null) {
    if (!isSuperAdminActor(req)) {
      const error = new Error("Only Super Admin can update global planning configuration.");
      error.status = 403;
      throw error;
    }
    return { scope: "global", government_structure_id: null };
  }

  const structureIndex = await loadGovernmentStructureIndex();
  const structureId = resolveManageableStructureId(req, requestedId, structureIndex);
  if (!structureId) {
    const error = new Error("A sector structure is required for sector planning configuration.");
    error.status = 400;
    throw error;
  }

  return { scope: "sector", government_structure_id: structureId };
}

async function loadOwnedPlanningConfigForVersion(versionId, transaction = null) {
  const planVersion = await PlanVersion.findByPk(versionId, { transaction });
  if (!planVersion) {
    const error = new Error("Plan version not found.");
    error.status = 404;
    throw error;
  }

  const master = await resolveMasterPlanVersionForConfig(planVersion, transaction);
  if (!master?.planning_configuration_id) {
    const error = new Error("This plan draft does not have an owned planning configuration snapshot.");
    error.status = 404;
    throw error;
  }

  const record = await PlanningConfiguration.findByPk(master.planning_configuration_id, {
    transaction,
  });

  if (!record?.owned_by_plan_version_id) {
    const error = new Error("This plan draft does not have an owned planning configuration snapshot.");
    error.status = 404;
    throw error;
  }

  return { planVersion, master, record };
}

const getPlanningConfiguration = async (req, res) => {
  try {
    let structureId;
    try {
      structureId = await resolveReadStructureId(req);
    } catch (error) {
      return sendScopeError(res, error);
    }

    const resolved = await resolveEffectivePlanningConfig(structureId);
    return res.json({ success: true, data: buildPlanningConfigResponse(resolved) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updatePlanningConfiguration = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    let target;
    try {
      target = await resolveWriteTarget(req);
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

    if (target.scope === "global") {
      await updateGlobalPlanningConfig(req.body, t);
    } else {
      await upsertSectorPlanningConfig(target.government_structure_id, req.body, t);
    }

    await t.commit();

    const resolved = await resolveEffectivePlanningConfig(target.government_structure_id);
    return res.json({
      success: true,
      message: "Planning configuration updated",
      data: buildPlanningConfigResponse(resolved),
    });
  } catch (error) {
    await t.rollback();
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const getPlanningConfigurationForVersion = async (req, res) => {
  try {
    const planVersion = await PlanVersion.findByPk(req.params.versionId);
    if (!planVersion) {
      return res.status(404).json({ success: false, message: "Plan version not found." });
    }

    const master = await resolveMasterPlanVersionForConfig(planVersion);
    const record =
      master?.planning_configuration_id
        ? await PlanningConfiguration.findByPk(master.planning_configuration_id)
        : null;

    if (record?.owned_by_plan_version_id) {
      return res.json({
        success: true,
        data: buildPlanningConfigResponseForVersion(record, master),
      });
    }

    const resolved = await resolveEffectivePlanningConfig(master?.government_structure_id ?? null);
    return res.json({ success: true, data: buildPlanningConfigResponse(resolved) });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const updatePlanningConfigurationForVersion = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { master, record } = await loadOwnedPlanningConfigForVersion(req.params.versionId, t);

    if (master.status !== "draft") {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Only draft master plans can update their planning configuration snapshot.",
      });
    }

    await applyPlanningConfigUpdates(record, req.body, t);
    await t.commit();

    const refreshed = await PlanningConfiguration.findByPk(record.planning_configuration_id);
    return res.json({
      success: true,
      message: "Draft planning configuration updated",
      data: buildPlanningConfigResponseForVersion(refreshed, master),
    });
  } catch (error) {
    await t.rollback();
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const restoreDefaultPlanningConfiguration = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    let target;
    try {
      target = await resolveWriteTarget(req);
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

    if (target.scope === "global") {
      await restoreGlobalPlanningConfig(t);
    } else {
      await restoreSectorPlanningConfig(target.government_structure_id, t);
    }

    await t.commit();

    const resolved = await resolveEffectivePlanningConfig(target.government_structure_id);
    return res.json({
      success: true,
      message: "Planning configuration restored to defaults",
      data: buildPlanningConfigResponse(resolved),
    });
  } catch (error) {
    await t.rollback();
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPlanningConfiguration,
  getPlanningConfigurationForVersion,
  updatePlanningConfiguration,
  updatePlanningConfigurationForVersion,
  restoreDefaultPlanningConfiguration,
};
