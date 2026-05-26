"use strict";

const { Op } = require("sequelize");
const { UserTitle } = require("../models");
const { getPagination, getPagingData } = require("../utils/pagination");

function formatUserTitle(record) {
  const plain = record?.toJSON ? record.toJSON() : record;
  return plain || null;
}

async function ensureUniqueFields({ name, code, excludeId }, transaction) {
  const where = {
    [Op.or]: [{ name }, { code }],
  };
  if (excludeId) {
    where.title_id = { [Op.ne]: excludeId };
  }

  const existing = await UserTitle.findOne({ where, transaction });
  if (!existing) return;

  if (existing.name === name) {
    const err = new Error("Title name already exists");
    err.status = 400;
    throw err;
  }
  if (existing.code === code) {
    const err = new Error("Title code already exists");
    err.status = 400;
    throw err;
  }
}

async function createUserTitle(payload, actorUserId) {
  const name = payload.name?.trim();
  const code = payload.code?.trim().toUpperCase();
  const status = payload.status === "inactive" ? "inactive" : "active";

  const t = await UserTitle.sequelize.transaction();
  try {
    await ensureUniqueFields({ name, code }, t);

    const title = await UserTitle.create(
      {
        name,
        code,
        status,
        created_by: actorUserId || null,
        updated_by: actorUserId || null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction: t }
    );

    await t.commit();
    return UserTitle.findByPk(title.title_id);
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
}

async function updateUserTitle(id, payload, actorUserId) {
  const title = await UserTitle.findByPk(id);
  if (!title) {
    const err = new Error("User title not found");
    err.status = 404;
    throw err;
  }

  const name = payload.name !== undefined ? payload.name.trim() : title.name;
  const code =
    payload.code !== undefined ? payload.code.trim().toUpperCase() : title.code;

  const t = await UserTitle.sequelize.transaction();
  try {
    await ensureUniqueFields({ name, code, excludeId: id }, t);

    const updates = {
      name,
      code,
      updated_by: actorUserId || null,
      updated_at: new Date(),
    };

    if (payload.status !== undefined) {
      updates.status = payload.status === "inactive" ? "inactive" : "active";
    }

    await title.update(updates, { transaction: t });
    await t.commit();

    return UserTitle.findByPk(id);
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
}

async function getUserTitleById(id) {
  const title = await UserTitle.findByPk(id);
  if (!title) {
    const err = new Error("User title not found");
    err.status = 404;
    throw err;
  }
  return title;
}

async function listUserTitles(query = {}) {
  const { status, search, page, limit, paginate } = query;
  const where = {};

  if (status === "active" || status === "inactive") {
    where.status = status;
  }

  if (search) {
    const term = `%${search.trim()}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: term } },
      { code: { [Op.iLike]: term } },
    ];
  }

  const order = [["name", "ASC"]];

  if (paginate === "true" || paginate === true) {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const { limit: take, offset } = getPagination(pageNum, limitNum);

    const result = await UserTitle.findAndCountAll({
      where,
      order,
      limit: take,
      offset,
    });

    const paging = getPagingData(result, pageNum, limitNum);
    return {
      paginated: true,
      count: paging.total,
      totalPages: paging.totalPages,
      currentPage: paging.currentPage,
      limit: paging.limit,
      data: paging.results.map(formatUserTitle),
    };
  }

  const rows = await UserTitle.findAll({ where, order });
  return {
    paginated: false,
    count: rows.length,
    data: rows.map(formatUserTitle),
  };
}

async function toggleUserTitleStatus(id, status, actorUserId) {
  const title = await getUserTitleById(id);
  const nextStatus = status === "inactive" ? "inactive" : "active";

  await title.update({
    status: nextStatus,
    updated_by: actorUserId || null,
    updated_at: new Date(),
  });

  return getUserTitleById(id);
}

async function deleteUserTitle(id, actorUserId) {
  const title = await getUserTitleById(id);
  await title.update({
    status: "inactive",
    updated_by: actorUserId || null,
    updated_at: new Date(),
  });
  await title.destroy();
  return true;
}

module.exports = {
  formatUserTitle,
  createUserTitle,
  updateUserTitle,
  getUserTitleById,
  listUserTitles,
  toggleUserTitleStatus,
  deleteUserTitle,
};
