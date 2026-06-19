"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const {
  FormConfigContainer,
  FormConfigField,
  IssueCategory,
  User,
  sequelize,
} = require("../models");

const CONTAINER_INCLUDES = [
  {
    model: FormConfigField,
    as: "fields",
    separate: true,
    order: [
      ["display_order", "ASC"],
      ["label", "ASC"],
    ],
  },
  {
    model: IssueCategory,
    as: "issueCategory",
    attributes: ["issue_category_id", "name", "code", "is_active"],
  },
  {
    model: User,
    as: "creator",
    attributes: ["user_id", "full_name", "email"],
  },
];

async function listContainers({ isActive, isPublished, search, issueCategoryId } = {}) {
  const where = {};
  if (isActive !== undefined) where.is_active = isActive;
  if (isPublished !== undefined) where.is_published = isPublished;
  if (issueCategoryId) where.issue_category_id = issueCategoryId;
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } },
    ];
  }

  return FormConfigContainer.findAll({
    where,
    include: CONTAINER_INCLUDES,
    order: [
      ["display_order", "ASC"],
      ["name", "ASC"],
    ],
  });
}

async function listPublishedContainers() {
  return FormConfigContainer.findAll({
    where: { is_active: true, is_published: true },
    include: [
      {
        model: FormConfigField,
        as: "fields",
        where: { is_active: true },
        required: false,
        separate: true,
        order: [
          ["display_order", "ASC"],
          ["label", "ASC"],
        ],
      },
      {
        model: IssueCategory,
        as: "issueCategory",
        attributes: ["issue_category_id", "name", "code"],
        where: { is_active: true },
        required: true,
      },
    ],
    order: [
      ["display_order", "ASC"],
      ["name", "ASC"],
    ],
  });
}

async function listPublishedContainersForCategory(categoryId) {
  const category = await IssueCategory.findByPk(categoryId);
  if (!category || !category.is_active) return [];

  return FormConfigContainer.findAll({
    where: {
      issue_category_id: categoryId,
      is_active: true,
      is_published: true,
    },
    include: [
      {
        model: FormConfigField,
        as: "fields",
        where: { is_active: true },
        required: false,
        separate: true,
        order: [
          ["display_order", "ASC"],
          ["label", "ASC"],
        ],
      },
      {
        model: IssueCategory,
        as: "issueCategory",
        attributes: ["issue_category_id", "name", "code"],
      },
    ],
    order: [
      ["display_order", "ASC"],
      ["name", "ASC"],
    ],
  });
}

async function getContainerById(id, { publishedOnly = false } = {}) {
  const where = { form_config_container_id: id };
  if (publishedOnly) {
    where.is_active = true;
    where.is_published = true;
  }

  return FormConfigContainer.findOne({
    where,
    include: CONTAINER_INCLUDES,
  });
}

async function getPublishedFormByContainerId(containerId) {
  const container = await getContainerById(containerId, { publishedOnly: true });
  if (!container) return null;

  const category = container.issueCategory;
  if (!category?.is_active) return null;

  const activeFields = (container.fields || []).filter((f) => f.is_active !== false);
  return { container, fields: activeFields };
}

async function createContainer(data, userId) {
  if (!data.issue_category_id) {
    const error = new Error("Issue category is required for form containers");
    error.statusCode = 400;
    throw error;
  }

  const category = await IssueCategory.findByPk(data.issue_category_id);
  if (!category || !category.is_active) {
    const error = new Error("Invalid or inactive issue category");
    error.statusCode = 400;
    throw error;
  }

  const container = await FormConfigContainer.create({
    form_config_container_id: uuidv4(),
    issue_category_id: data.issue_category_id,
    name: data.name,
    code: data.code,
    description: data.description ?? null,
    version_number: data.version_number ?? 1,
    is_active: data.is_active !== undefined ? data.is_active : true,
    is_published: false,
    display_order: data.display_order ?? 0,
    created_by: userId,
    updated_by: userId,
  });

  return getContainerById(container.form_config_container_id);
}

async function updateContainer(id, data, userId) {
  const container = await FormConfigContainer.findByPk(id);
  if (!container) {
    const error = new Error("Form configuration container not found");
    error.statusCode = 404;
    throw error;
  }

  if (data.issue_category_id !== undefined) {
    if (!data.issue_category_id) {
      const error = new Error("Issue category is required for form containers");
      error.statusCode = 400;
      throw error;
    }
    const category = await IssueCategory.findByPk(data.issue_category_id);
    if (!category || !category.is_active) {
      const error = new Error("Invalid or inactive issue category");
      error.statusCode = 400;
      throw error;
    }
  }

  const patch = { ...data, updated_by: userId };
  delete patch.is_published;

  await container.update(patch);
  return getContainerById(id);
}

async function deleteContainer(id) {
  const container = await FormConfigContainer.findByPk(id);
  if (!container) {
    const error = new Error("Form configuration container not found");
    error.statusCode = 404;
    throw error;
  }

  await container.destroy();
  return { deleted: true };
}

async function setContainerPublished(id, isPublished, userId) {
  const container = await FormConfigContainer.findByPk(id);
  if (!container) {
    const error = new Error("Form configuration container not found");
    error.statusCode = 404;
    throw error;
  }

  if (isPublished) {
    const fieldCount = await FormConfigField.count({
      where: { form_config_container_id: id, is_active: true },
    });
    if (fieldCount === 0) {
      const error = new Error("Publish requires at least one active field");
      error.statusCode = 400;
      throw error;
    }
  }

  await container.update({ is_published: isPublished, updated_by: userId });
  return getContainerById(id);
}

async function setContainerActive(id, isActive, userId) {
  const container = await FormConfigContainer.findByPk(id);
  if (!container) {
    const error = new Error("Form configuration container not found");
    error.statusCode = 404;
    throw error;
  }

  await container.update({ is_active: isActive, updated_by: userId });
  return getContainerById(id);
}

module.exports = {
  listContainers,
  listPublishedContainers,
  listPublishedContainersForCategory,
  getContainerById,
  getPublishedFormByContainerId,
  createContainer,
  updateContainer,
  deleteContainer,
  setContainerPublished,
  setContainerActive,
};
