"use strict";

const {
  AMENDMENT_TYPE,
  AMENDMENT_TYPE_VALUES,
  normalizeAmendmentType,
  isAmendmentTypeMarkedAvailable,
  amendmentTypeLabel,
} = require("../../utils/planAmendmentTypes");
const { PlaceholderAmendmentHandler } = require("./handlers/placeholderHandlers");
const { TargetReallocationHandler } = require("./handlers/targetReallocationHandler");
const {
  AnnualTargetRevisionHandler,
} = require("./handlers/annualTargetRevisionHandler");
const { KpiAdditionHandler } = require("./handlers/kpiAdditionHandler");
const {
  ExecutionWindowReopeningHandler,
} = require("./handlers/executionWindowReopeningHandler");

/** @type {Map<string, import('./handlers/PlanAmendmentHandler').PlanAmendmentHandler>} */
const handlersByType = new Map();

let defaultsRegistered = false;

function registerAmendmentHandler(handler) {
  if (!handler || typeof handler.supports !== "function") {
    throw new Error("registerAmendmentHandler requires a PlanAmendmentHandler-like object");
  }
  const type = normalizeAmendmentType(handler.type);
  if (!type) {
    throw new Error(`Cannot register handler with unknown type: ${handler.type}`);
  }
  handlersByType.set(type, handler);
  return handler;
}

function unregisterAmendmentHandler(amendmentType) {
  const type = normalizeAmendmentType(amendmentType);
  if (!type) return false;
  return handlersByType.delete(type);
}

function clearAmendmentHandlers() {
  handlersByType.clear();
  defaultsRegistered = false;
}

function resolveAmendmentHandler(amendmentType) {
  ensureDefaultAmendmentHandlers();
  const type = normalizeAmendmentType(amendmentType);
  if (!type) return null;
  return handlersByType.get(type) ?? null;
}

function listRegisteredAmendmentTypes() {
  ensureDefaultAmendmentHandlers();
  return [...handlersByType.keys()];
}

function listAvailableAmendmentTypes() {
  ensureDefaultAmendmentHandlers();
  return [...handlersByType.entries()]
    .filter(([, handler]) => Boolean(handler.isAvailable?.()))
    .map(([type]) => type);
}

function getAmendmentHandlerCatalog() {
  ensureDefaultAmendmentHandlers();
  return AMENDMENT_TYPE_VALUES.map((type) => {
    const handler = handlersByType.get(type) ?? null;
    return {
      type,
      label: amendmentTypeLabel(type),
      registered: Boolean(handler),
      available: Boolean(handler?.isAvailable?.()),
      catalog_available: isAmendmentTypeMarkedAvailable(type),
    };
  });
}

/**
 * Registers placeholders for every known type, then installs the real
 * Target Reallocation handler (only available type in v1).
 */
function ensureDefaultAmendmentHandlers() {
  if (defaultsRegistered && handlersByType.size > 0) {
    return;
  }

  for (const type of AMENDMENT_TYPE_VALUES) {
    if (!handlersByType.has(type)) {
      handlersByType.set(type, new PlaceholderAmendmentHandler(type));
    }
  }

  handlersByType.set(AMENDMENT_TYPE.TARGET_REALLOCATION, new TargetReallocationHandler());
  handlersByType.set(
    AMENDMENT_TYPE.ANNUAL_TARGET_REVISION,
    new AnnualTargetRevisionHandler()
  );
  handlersByType.set(AMENDMENT_TYPE.KPI_ADDITION, new KpiAdditionHandler());
  handlersByType.set(
    AMENDMENT_TYPE.EXECUTION_WINDOW_REOPENING,
    new ExecutionWindowReopeningHandler()
  );

  defaultsRegistered = true;
}

function registerDefaultAmendmentHandlers() {
  clearAmendmentHandlers();
  ensureDefaultAmendmentHandlers();
  return getAmendmentHandlerCatalog();
}

module.exports = {
  registerAmendmentHandler,
  unregisterAmendmentHandler,
  clearAmendmentHandlers,
  resolveAmendmentHandler,
  listRegisteredAmendmentTypes,
  listAvailableAmendmentTypes,
  getAmendmentHandlerCatalog,
  ensureDefaultAmendmentHandlers,
  registerDefaultAmendmentHandlers,
};
