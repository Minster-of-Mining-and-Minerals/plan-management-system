"use strict";

const inspectionConfig = {
  baseUrl:
    process.env.INSPECTION_API_BASE_URL ||
    "https://inspection.mom.gov.et/api/v1/integration/inspection-analytics",
  apiKey: process.env.INSPECTION_API_KEY || "",
  cacheTtlSeconds: parseInt(process.env.INSPECTION_CACHE_TTL_SECONDS, 10) || 300,
  timeoutMs: parseInt(process.env.INSPECTION_REQUEST_TIMEOUT_MS, 10) || 12000,
};

module.exports = inspectionConfig;

