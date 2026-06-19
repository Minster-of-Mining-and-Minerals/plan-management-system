"use strict";

const { v4: uuidv4 } = require("uuid");
const { IssueCategory } = require("../models");
const {
  assertCanConfigureIssueCategoryForm,
} = require("../utils/issueCategoryPermissionUtils");

const CATEGORY_INCLUDES = [
  {
    model: IssueCategory,
    as: "parent",
    attributes: ["issue_category_id", "name", "code"],
  },
];

async function listCategories({ isActive, parentCategoryId, selectableOnly } = {}) {
  const where = {};
  if (isActive !== undefined) where.is_active = isActive;
  if (parentCategoryId !== undefined) {
    where.parent_category_id = parentCategoryId || null;
  }
  if (selectableOnly === true) {
    where.is_selectable = true;
  }

  return IssueCategory.findAll({
    where,
    include: CATEGORY_INCLUDES,
    order: [
      ["display_order", "ASC"],
      ["name", "ASC"],
    ],
  });
}

async function getCategoryById(id) {
  return IssueCategory.findByPk(id, { include: CATEGORY_INCLUDES });
}

async function createCategory(data, userPermissions = []) {
  assertCanConfigureIssueCategoryForm(userPermissions, data, { isCreate: true });

  if (data.parent_category_id) {
    const parent = await IssueCategory.findByPk(data.parent_category_id);
    if (!parent) {
      const error = new Error("Parent issue category not found");
      error.statusCode = 400;
      throw error;
    }
  }

  return IssueCategory.create({
    issue_category_id: uuidv4(),
    parent_category_id: data.parent_category_id ?? null,
    code: data.code ?? null,
    name: data.name,
    description: data.description ?? null,
    form_config: data.form_config ?? {},
    display_order: data.display_order ?? 0,
    is_selectable: data.is_selectable !== undefined ? data.is_selectable : true,
    is_active: data.is_active !== undefined ? data.is_active : true,
  });
}

async function updateCategory(id, data, userPermissions = []) {
  assertCanConfigureIssueCategoryForm(userPermissions, data);

  const category = await IssueCategory.findByPk(id);
  if (!category) {
    const error = new Error("Issue category not found");
    error.statusCode = 404;
    throw error;
  }

  if (data.parent_category_id) {
    const parent = await IssueCategory.findByPk(data.parent_category_id);
    if (!parent) {
      const error = new Error("Parent issue category not found");
      error.statusCode = 400;
      throw error;
    }
  }

  await category.update(data);
  return getCategoryById(id);
}

async function deactivateCategory(id) {
  return updateCategory(id, { is_active: false });
}

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deactivateCategory,
};
