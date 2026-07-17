"use strict";

const { Op } = require("sequelize");
const { AuditLog, User } = require("../models");
const {
  getPagination,
  getPagingData,
  parsePageLimit,
} = require("../utils/pagination");

async function listAuditLogs(query = {}) {
  const { page, limit } = parsePageLimit(query, {
    page: 1,
    limit: 25,
    maxLimit: 100,
  });
  const { limit: take, offset } = getPagination(page, limit);

  const where = {};
  if (query.actor_user_id) where.actor_user_id = query.actor_user_id;
  if (query.resource_type) where.resource_type = query.resource_type;
  if (query.action) where.action = query.action;
  if (query.resource_id) where.resource_id = query.resource_id;

  if (query.from_date || query.to_date) {
    where.created_at = {};
    if (query.from_date) {
      where.created_at[Op.gte] = new Date(`${query.from_date}T00:00:00`);
    }
    if (query.to_date) {
      where.created_at[Op.lte] = new Date(`${query.to_date}T23:59:59.999`);
    }
  }

  if (query.search?.trim()) {
    const q = `%${query.search.trim()}%`;
    where[Op.or] = [
      { action: { [Op.iLike]: q } },
      { resource_type: { [Op.iLike]: q } },
      { ip_address: { [Op.iLike]: q } },
      { "$actor.full_name$": { [Op.iLike]: q } },
      { "$actor.email$": { [Op.iLike]: q } },
    ];
  }

  const result = await AuditLog.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: "actor",
        attributes: ["user_id", "full_name", "email"],
        required: false,
      },
    ],
    order: [["created_at", "DESC"]],
    limit: take,
    offset,
    distinct: true,
    subQuery: false,
  });

  const paging = getPagingData(
    {
      count: Array.isArray(result.count) ? result.count.length : result.count,
      rows: result.rows,
    },
    page,
    limit
  );

  return {
    total: paging.total,
    totalPages: paging.totalPages,
    currentPage: paging.currentPage,
    limit: paging.limit,
    results: paging.results.map((r) => r.get({ plain: true })),
  };
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function exportAuditLogsCsv(query = {}) {
  const where = {};
  if (query.actor_user_id) where.actor_user_id = query.actor_user_id;
  if (query.resource_type) where.resource_type = query.resource_type;
  if (query.action) where.action = query.action;
  if (query.resource_id) where.resource_id = query.resource_id;

  if (query.from_date || query.to_date) {
    where.created_at = {};
    if (query.from_date) {
      where.created_at[Op.gte] = new Date(`${query.from_date}T00:00:00`);
    }
    if (query.to_date) {
      where.created_at[Op.lte] = new Date(`${query.to_date}T23:59:59.999`);
    }
  }

  if (query.search?.trim()) {
    const q = `%${query.search.trim()}%`;
    where[Op.or] = [
      { action: { [Op.iLike]: q } },
      { resource_type: { [Op.iLike]: q } },
      { ip_address: { [Op.iLike]: q } },
      { "$actor.full_name$": { [Op.iLike]: q } },
      { "$actor.email$": { [Op.iLike]: q } },
    ];
  }

  const maxRows = Math.min(Number(query.max_rows) || 10000, 25000);
  const rows = await AuditLog.findAll({
    where,
    include: [
      {
        model: User,
        as: "actor",
        attributes: ["user_id", "full_name", "email"],
        required: false,
      },
    ],
    order: [["created_at", "DESC"]],
    limit: maxRows,
    subQuery: false,
  });

  const header = [
    "created_at",
    "actor_name",
    "actor_email",
    "actor_user_id",
    "action",
    "resource_type",
    "resource_id",
    "ip_address",
    "details_json",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    const plain = row.get({ plain: true });
    lines.push(
      [
        csvEscape(plain.created_at?.toISOString?.() || plain.created_at),
        csvEscape(plain.actor?.full_name),
        csvEscape(plain.actor?.email),
        csvEscape(plain.actor_user_id),
        csvEscape(plain.action),
        csvEscape(plain.resource_type),
        csvEscape(plain.resource_id),
        csvEscape(plain.ip_address),
        csvEscape(JSON.stringify(plain.details || {})),
      ].join(",")
    );
  }

  return { csv: lines.join("\n"), count: rows.length };
}

module.exports = { listAuditLogs, exportAuditLogsCsv };

