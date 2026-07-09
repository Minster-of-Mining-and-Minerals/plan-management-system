"use strict";

const { PlanVersion } = require("../models");

async function resolveMasterPlanVersionForConfig(planVersion, transaction = null) {
  if (!planVersion) return null;

  const versionId = planVersion.plan_version_id ?? planVersion;
  const version =
    typeof planVersion.get === "function"
      ? planVersion
      : await PlanVersion.findByPk(versionId, { transaction });

  if (!version) return null;
  if (version.version_kind === "master") return version;

  if (version.version_kind === "annual" && version.parent_plan_version_id) {
    return PlanVersion.findByPk(version.parent_plan_version_id, { transaction });
  }

  if (version.version_kind === "execution_period" && version.parent_plan_version_id) {
    const annual = await PlanVersion.findByPk(version.parent_plan_version_id, { transaction });
    if (!annual?.parent_plan_version_id) return annual;
    return PlanVersion.findByPk(annual.parent_plan_version_id, { transaction });
  }

  return version;
}

module.exports = {
  resolveMasterPlanVersionForConfig,
};
