"use strict";

let adapters = null;

function configureIntegration(nextAdapters = {}) {
  adapters = { ...nextAdapters };
}

function getIntegrationAdapters() {
  return adapters || {};
}

function isIntegrated() {
  return Boolean(adapters);
}

module.exports = {
  configureIntegration,
  getIntegrationAdapters,
  isIntegrated,
};
