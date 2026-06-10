"use strict";

const { validate: uuidValidate } = require("uuid");

function isValidUuid(id) {
  return typeof id === "string" && uuidValidate(id);
}

function collectDescendantIds(rootId, nodes, idField, parentField = "parent_id") {
  const ids = [];
  const queue = [rootId];

  while (queue.length > 0) {
    const current = queue.shift();
    const children = nodes.filter((node) => node[parentField] === current);
    for (const child of children) {
      ids.push(child[idField]);
      queue.push(child[idField]);
    }
  }

  return ids;
}

function inactiveStructureResponse(res, entityLabel = "Structure") {
  return res.status(409).json({
    success: false,
    message: `${entityLabel} is deactivated. Only viewing is allowed.`,
  });
}

function alreadyActiveResponse(res, entityLabel = "Structure") {
  return res.status(409).json({
    success: false,
    message: `${entityLabel} is already active.`,
  });
}

function inactiveParentBlocksReactivationResponse(res, entityLabel = "Parent") {
  return res.status(409).json({
    success: false,
    message: `Cannot reactivate while ${entityLabel.toLowerCase()} is deactivated.`,
  });
}

module.exports = {
  isValidUuid,
  collectDescendantIds,
  inactiveStructureResponse,
  alreadyActiveResponse,
  inactiveParentBlocksReactivationResponse,
};
