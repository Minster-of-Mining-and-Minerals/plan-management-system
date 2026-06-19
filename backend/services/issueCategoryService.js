"use strict";

const { v4: uuidv4 } = require("uuid");
const { IssueCategory, FormConfigContainer, FormConfigField } = require("../models");
const {
  assertCanConfigureIssueCategoryForm,
} = require("../utils/issueCategoryPermissionUtils");

const CATEGORY_INCLUDES = [
  {
    model: FormConfigContainer,
    as: "formConfigContainers",
    attributes: [
      "form_config_container_id",
      "name",
      "code",
      "is_published",
      "is_active",
      "display_order",
    ],
    required: false,
    separate: true,
    order: [
      ["display_order", "ASC"],
      ["name", "ASC"],
    ],
    include: [
      {
        model: FormConfigField,
        as: "fields",
        attributes: ["form_config_field_id", "is_active"],
        required: false,
        separate: true,
      },
    ],
  },
];

async function listCategories({ isActive, forRaising } = {}) {
  const where = { is_selectable: true };

  if (isActive !== undefined) where.is_active = isActive;
  if (forRaising === true) {
    where.is_active = true;
  }

  const include = [...CATEGORY_INCLUDES];

  if (forRaising === true) {
    include[0] = {
      ...include[0],
      where: { is_active: true, is_published: true },
      required: true,
    };
  }

  return IssueCategory.findAll({
    where,
    include,
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

  return IssueCategory.create({
    issue_category_id: uuidv4(),
    parent_category_id: null,
    code: data.code ?? null,
    name: data.name,
    description: data.description ?? null,
    form_config: {},
    display_order: data.display_order ?? 0,
    is_selectable: true,
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

  const patch = { ...data };
  delete patch.parent_category_id;
  delete patch.is_selectable;
  delete patch.form_config;

  await category.update(patch);
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
