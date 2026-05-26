"use strict";

const { Op } = require("sequelize");
const { Department, User } = require("../models");
const { slugify } = require("../utils/slugify");
const { getPagination, getPagingData } = require("../utils/pagination");

const headInclude = {
  model: User,
  as: "head",
  attributes: ["user_id", "full_name", "email"],
  required: false,
};

function formatDepartment(record) {
  const plain = record?.toJSON ? record.toJSON() : record;
  if (!plain) return null;
  return {
    ...plain,
    dept_head_name: plain.head?.full_name ?? null,
    dept_head_email: plain.head?.email ?? null,
  };
}

async function ensureUniqueFields({ name, code, slug, excludeId }, transaction) {
  const where = {
    [Op.or]: [
      { name },
      { code },
      { slug },
    ],
  };
  if (excludeId) {
    where.department_id = { [Op.ne]: excludeId };
  }

  const existing = await Department.findOne({ where, transaction });
  if (!existing) return;

  if (existing.name === name) {
    const err = new Error("Department name already exists");
    err.status = 400;
    throw err;
  }
  if (existing.code === code) {
    const err = new Error("Department code already exists");
    err.status = 400;
    throw err;
  }
  if (existing.slug === slug) {
    const err = new Error("Department slug already exists");
    err.status = 400;
    throw err;
  }
}

async function validateDeptHead(deptHeadId, transaction) {
  if (!deptHeadId) return;
  const head = await User.findByPk(deptHeadId, { transaction });
  if (!head) {
    const err = new Error("Department head user not found");
    err.status = 400;
    throw err;
  }
}

function buildSlug(code, name) {
  return slugify(code || name) || `dept-${Date.now()}`;
}

async function createDepartment(payload, actorUserId) {
  const name = payload.name?.trim();
  const code = payload.code?.trim().toUpperCase();
  const slug = buildSlug(code, name);
  const status = payload.status === "inactive" ? "inactive" : "active";

  const t = await Department.sequelize.transaction();
  try {
    await ensureUniqueFields({ name, code, slug }, t);
    await validateDeptHead(payload.dept_head, t);

    const department = await Department.create(
      {
        name,
        code,
        slug,
        dept_head: payload.dept_head || null,
        status,
        created_by: actorUserId || null,
        updated_by: actorUserId || null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction: t }
    );

    await t.commit();
    return Department.findByPk(department.department_id, { include: [headInclude] });
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
}

async function updateDepartment(id, payload, actorUserId) {
  const department = await Department.findByPk(id);
  if (!department) {
    const err = new Error("Department not found");
    err.status = 404;
    throw err;
  }

  const name = payload.name !== undefined ? payload.name.trim() : department.name;
  const code =
    payload.code !== undefined ? payload.code.trim().toUpperCase() : department.code;
  const slug = buildSlug(code, name);

  const t = await Department.sequelize.transaction();
  try {
    await ensureUniqueFields({ name, code, slug, excludeId: id }, t);
    if (payload.dept_head !== undefined) {
      await validateDeptHead(payload.dept_head, t);
    }

    const updates = {
      name,
      code,
      slug,
      updated_by: actorUserId || null,
      updated_at: new Date(),
    };

    if (payload.dept_head !== undefined) updates.dept_head = payload.dept_head || null;
    if (payload.status !== undefined) {
      updates.status = payload.status === "inactive" ? "inactive" : "active";
    }

    await department.update(updates, { transaction: t });
    await t.commit();

    return Department.findByPk(id, { include: [headInclude] });
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
}

async function getDepartmentById(id) {
  const department = await Department.findByPk(id, { include: [headInclude] });
  if (!department) {
    const err = new Error("Department not found");
    err.status = 404;
    throw err;
  }
  return department;
}

async function listDepartments(query = {}) {
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
      { slug: { [Op.iLike]: term } },
    ];
  }

  const order = [["created_at", "DESC"]];

  if (paginate === "true" || paginate === true) {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const { limit: take, offset } = getPagination(pageNum, limitNum);

    const result = await Department.findAndCountAll({
      where,
      include: [headInclude],
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
      data: paging.results.map(formatDepartment),
    };
  }

  const rows = await Department.findAll({
    where,
    include: [headInclude],
    order,
  });

  return {
    paginated: false,
    count: rows.length,
    data: rows.map(formatDepartment),
  };
}

async function toggleDepartmentStatus(id, status, actorUserId) {
  const department = await getDepartmentById(id);
  const nextStatus = status === "inactive" ? "inactive" : "active";

  await department.update({
    status: nextStatus,
    updated_by: actorUserId || null,
    updated_at: new Date(),
  });

  return getDepartmentById(id);
}

async function deleteDepartment(id, actorUserId) {
  const department = await getDepartmentById(id);
  await department.update({
    status: "inactive",
    updated_by: actorUserId || null,
    updated_at: new Date(),
  });
  await department.destroy();
  return true;
}

module.exports = {
  formatDepartment,
  createDepartment,
  updateDepartment,
  getDepartmentById,
  listDepartments,
  toggleDepartmentStatus,
  deleteDepartment,
};
