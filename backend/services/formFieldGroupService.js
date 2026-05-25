"use strict";

const { FormFieldGroup, FormField } = require("../models");
const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const { PATIENT_MODEL_NAME } = require("../config/userFormConstants");
const { isCoreFormField } = require("../config/corePatientFormFields");
const {
  assertValidGroupRequiredState,
  buildGroupPayload,
  isGroupStepRequired,
} = require("./formFieldRuleService");
const { normalizeFieldRecord } = require("./formFieldNormalize");

const ACCOUNT_GROUP_TITLE = "Account";

async function getGroupsByModel(modelName, { visibleOnly = false } = {}) {
  const where = { model_name: modelName };
  if (visibleOnly) {
    where.is_visible = true;
  }

  return FormFieldGroup.findAll({
    where,
    include: [
      {
        model: FormField,
        as: "fields",
        required: false,
      },
    ],
    order: [
      ["sort_order", "ASC"],
      ["created_at", "ASC"],
      [{ model: FormField, as: "fields" }, "sort_order", "ASC"],
    ],
  });
}

async function getAccountGroup(modelName = PATIENT_MODEL_NAME) {
  let group = await FormFieldGroup.findOne({
    where: { model_name: modelName, title: ACCOUNT_GROUP_TITLE },
  });

  if (!group) {
    const max = await FormFieldGroup.max("sort_order", {
      where: { model_name: modelName },
    });
    group = await FormFieldGroup.create({
      group_id: uuidv4(),
      model_name: modelName,
      title: ACCOUNT_GROUP_TITLE,
      description: "Required account information",
      sort_order: 0,
      is_visible: true,
      is_required: true,
    });
  }

  return group;
}

async function ensureAccountGroup(modelName = PATIENT_MODEL_NAME) {
  return getAccountGroup(modelName);
}

function normalizeGroupRecord(group) {
  const plain = group?.toJSON ? group.toJSON() : group;
  if (!plain) return null;

  const fields = (plain.fields || []).map(normalizeFieldRecord).filter(Boolean);
  return buildGroupPayload(plain, fields);
}

function buildGroupedFormResponse(groups) {
  const normalized = groups.map(normalizeGroupRecord).filter(Boolean);
  const visibleGroups = normalized.filter((g) => g.is_visible);
  const allFields = normalized.flatMap((g) => g.fields);

  return {
    groups: normalized,
    steps: visibleGroups,
    core_fields: allFields.filter((f) => f.storage_type === "core"),
    fields: allFields,
  };
}

async function getGroupedFormConfig(modelName, { visibleOnly = false } = {}) {
  const groups = await getGroupsByModel(modelName, { visibleOnly });
  return buildGroupedFormResponse(groups);
}

async function syncGroupRequiredFromFields(groupId) {
  const group = await FormFieldGroup.findByPk(groupId, {
    include: [{ model: FormField, as: "fields" }],
  });
  if (!group) return null;

  const fields = group.fields || [];
  if (!isGroupStepRequired(group, fields)) {
    await group.update({ is_required: false, updated_at: new Date() });
  }
  return group;
}

async function createFormFieldGroup(payload) {
  const {
    model_name = PATIENT_MODEL_NAME,
    title,
    description = null,
    sort_order,
    is_visible = true,
    is_required = false,
  } = payload;

  let order = sort_order;
  if (order === undefined) {
    const max = await FormFieldGroup.max("sort_order", {
      where: { model_name },
    });
    order = (max ?? -1) + 1;
  }

  const group = await FormFieldGroup.create({
    group_id: uuidv4(),
    model_name,
    title,
    description,
    sort_order: order,
    is_visible,
    is_required: false,
  });

  if (is_required) {
    await group.update({ is_required: true });
    assertValidGroupRequiredState(group, []);
  }

  return group;
}

async function updateFormFieldGroup(groupId, updates) {
  const group = await FormFieldGroup.findByPk(groupId, {
    include: [{ model: FormField, as: "fields" }],
  });

  if (!group) {
    const err = new Error("Group not found");
    err.status = 404;
    throw err;
  }

  const fields = group.fields || [];
  const next = { ...updates, updated_at: new Date() };

  if (next.is_required !== undefined) {
    assertValidGroupRequiredState(
      { ...group.toJSON(), is_required: next.is_required },
      fields
    );
  }

  const previousTitle = group.title;

  await group.update(next);
  await group.reload();

  if (next.title && next.title !== previousTitle) {
    await FormField.update(
      { category: group.title, updated_at: new Date() },
      { where: { group_id: groupId } }
    );
  }

  await syncGroupRequiredFromFields(groupId);
  return FormFieldGroup.findByPk(groupId, {
    include: [{ model: FormField, as: "fields" }],
  });
}

async function deleteFormFieldGroup(groupId) {
  const group = await FormFieldGroup.findByPk(groupId, {
    include: [{ model: FormField, as: "fields" }],
  });

  if (!group) {
    const err = new Error("Group not found");
    err.status = 404;
    throw err;
  }

  const fields = group.fields || [];
  const hasCore = fields.some(isCoreFormField);
  if (hasCore) {
    const err = new Error(
      "Cannot delete a group that contains core system fields (Account)"
    );
    err.status = 403;
    throw err;
  }

  const hasRequired = fields.some((f) => f.is_required);
  if (hasRequired) {
    const err = new Error(
      "Cannot delete a group with required fields. Reassign or make fields optional first."
    );
    err.status = 400;
    throw err;
  }

  if (fields.length > 0) {
    const err = new Error(
      "Cannot delete a group that still has fields. Reassign fields to another group first."
    );
    err.status = 400;
    throw err;
  }

  await group.destroy();
}

async function reorderFormFieldGroups(modelName, orderedGroupIds) {
  const groups = await FormFieldGroup.findAll({
    where: { model_name: modelName },
  });

  const idSet = new Set(groups.map((g) => g.group_id));
  if (orderedGroupIds.length !== idSet.size) {
    const err = new Error("orderedGroupIds must include every group for this model");
    err.status = 400;
    throw err;
  }

  for (const id of orderedGroupIds) {
    if (!idSet.has(id)) {
      const err = new Error(`Unknown group_id: ${id}`);
      err.status = 400;
      throw err;
    }
  }

  await Promise.all(
    orderedGroupIds.map((groupId, index) =>
      FormFieldGroup.update(
        { sort_order: index, updated_at: new Date() },
        { where: { group_id: groupId } }
      )
    )
  );

  return getGroupsByModel(modelName);
}

module.exports = {
  ACCOUNT_GROUP_TITLE,
  getGroupsByModel,
  getAccountGroup,
  ensureAccountGroup,
  normalizeGroupRecord,
  buildGroupedFormResponse,
  getGroupedFormConfig,
  syncGroupRequiredFromFields,
  createFormFieldGroup,
  updateFormFieldGroup,
  deleteFormFieldGroup,
  reorderFormFieldGroups,
};
