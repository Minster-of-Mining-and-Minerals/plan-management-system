"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  IssueCategory,
} = require("../models");

async function listCategories({ isActive } = {}) {
  const where = {};
  if (isActive !== undefined) where.is_active = isActive;
  return IssueCategory.findAll({
    where,
    order: [
      ["display_order", "ASC"],
      ["name", "ASC"],
    ],
  });
}

async function getCategoryById(id) {
  return IssueCategory.findByPk(id);
}

async function createCategory(data) {
  return IssueCategory.create({
    issue_category_id: uuidv4(),
    name: data.name,
    description: data.description ?? null,
    display_order: data.display_order ?? 0,
    is_active: data.is_active !== undefined ? data.is_active : true,
  });
}

async function updateCategory(id, data) {
  const category = await IssueCategory.findByPk(id);
  if (!category) {
    const error = new Error("Issue category not found");
    error.statusCode = 404;
    throw error;
  }
  await category.update(data);
  return category;
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
