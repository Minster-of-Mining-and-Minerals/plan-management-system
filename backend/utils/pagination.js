"use strict";

/**
 * Parse page/limit from query-like input with sane caps.
 */
function parsePageLimit(query = {}, defaults = { page: 1, limit: 20, maxLimit: 100 }) {
  const pageNum = Math.max(parseInt(query.page, 10) || defaults.page, 1);
  const rawLimit = parseInt(query.limit, 10) || defaults.limit;
  const limitNum = Math.min(Math.max(rawLimit, 1), defaults.maxLimit || 100);
  return { page: pageNum, limit: limitNum };
}

function getPagination(page = 1, limit = 10) {
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
  return {
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
  };
}

function getPagingData(data, page, limit) {
  const { count: total, rows: results } = data;
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
  const totalPages = Math.max(1, Math.ceil(total / limitNum) || 1);

  return {
    total,
    totalPages,
    currentPage,
    limit: limitNum,
    results,
  };
}

/** True when caller explicitly asked for pagination (page or limit present). */
function wantsPagination(query = {}) {
  return query.page !== undefined || query.limit !== undefined || query.paginate === "true" || query.paginate === true;
}

module.exports = {
  getPagination,
  getPagingData,
  parsePageLimit,
  wantsPagination,
};
