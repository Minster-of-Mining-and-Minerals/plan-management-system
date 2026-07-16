"use strict";

const { Op } = require("sequelize");
const { PlanAmendment } = require("../../models");

async function resolveNextAmendmentVersion(masterPlanVersionId, transaction = null) {
  const currentMax = await PlanAmendment.max("version", {
    where: {
      master_plan_version_id: masterPlanVersionId,
      version: { [Op.ne]: null },
    },
    transaction,
  });
  return (Number(currentMax) || 0) + 1;
}

async function resolveCurrentAmendmentVersion(masterPlanVersionId, transaction = null) {
  const currentMax = await PlanAmendment.max("version", {
    where: {
      master_plan_version_id: masterPlanVersionId,
      version: { [Op.ne]: null },
    },
    transaction,
  });
  return Number(currentMax) || 0;
}

module.exports = {
  resolveNextAmendmentVersion,
  resolveCurrentAmendmentVersion,
};
