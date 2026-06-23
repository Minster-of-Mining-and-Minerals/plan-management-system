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

function collectAncestorIds(structureId, nodes, idField = "government_structure_id", parentField = "parent_id") {
  const byId = new Map(nodes.map((node) => [node[idField], node]));
  const ids = [];
  const seen = new Set();
  let currentId = structureId;

  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    ids.push(currentId);
    const node = byId.get(currentId);
    if (!node?.[parentField]) {
      break;
    }
    currentId = node[parentField];
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
  collectAncestorIds,
  inactiveStructureResponse,
  alreadyActiveResponse,
  inactiveParentBlocksReactivationResponse,
};
