"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const { DIAGNOSIS_MODEL_NAME } = require("../config/diagnosisFormConstants");
const { buildGroupedFormResponse, syncGroupRequiredFromFields } = require("./formFieldGroupService");
const { normalizeFieldRecord } = require("./formFieldNormalize");
const {
  assertFieldKeyForStorage,
  ensureUniqueFieldKeyForTemplate,
  getGroupForField,
} = require("./formFieldService");
const {
  seedDefaultStructureToTarget,
  copyStructure,
} = require("./diagnosisStructureCopy");

async function ensureTemplateHasStructure(template) {
  const count = await db.FormFieldGroup.count({
    where: {
      diagnosis_template_id: template.template_id,
      model_name: DIAGNOSIS_MODEL_NAME,
    },
  });
  if (count === 0) {
    await seedDefaultStructureToTarget({
      templateId: template.template_id,
      templateTitle: template.title,
    });
  }
}

async function listTemplates({ status, includeArchived = false } = {}) {
  const where = {};
  if (status) where.status = status;
  else if (!includeArchived) where.status = "active";

  const rows = await db.DiagnosisTemplate.findAll({
    where,
    order: [["title", "ASC"]],
  });

  for (const row of rows) {
    await ensureTemplateHasStructure(row);
  }

  return rows;
}

async function getTemplateById(templateId) {
  const row = await db.DiagnosisTemplate.findByPk(templateId);
  if (!row) {
    const err = new Error("Diagnosis template not found");
    err.status = 404;
    throw err;
  }
  return row;
}

async function getGroupsByTemplate(templateId, { visibleOnly = false } = {}) {
  const where = {
    model_name: DIAGNOSIS_MODEL_NAME,
    diagnosis_template_id: templateId,
  };
  if (visibleOnly) where.is_visible = true;

  return db.FormFieldGroup.findAll({
    where,
    include: [
      {
        model: db.FormField,
        as: "fields",
        required: false,
        where: visibleOnly ? { is_visible: true } : undefined,
      },
    ],
    order: [
      ["sort_order", "ASC"],
      [{ model: db.FormField, as: "fields" }, "sort_order", "ASC"],
    ],
  });
}

async function getGroupedFormForTemplate(templateId, { visibleOnly = false } = {}) {
  const groups = await getGroupsByTemplate(templateId, { visibleOnly });
  return buildGroupedFormResponse(groups);
}

async function createTemplate({ title, description, seedDefaults = true, actorId }) {
  const row = await db.DiagnosisTemplate.create({
    template_id: uuidv4(),
    title,
    description: description || null,
    status: "active",
    created_by: actorId,
    updated_by: actorId,
  });

  if (seedDefaults) {
    await seedDefaultStructureToTarget({
      templateId: row.template_id,
      templateTitle: row.title,
    });
  }

  return getTemplateById(row.template_id);
}

async function updateTemplate(templateId, payload, actorId) {
  const row = await getTemplateById(templateId);
  await row.update({
    title: payload.title ?? row.title,
    description:
      payload.description !== undefined ? payload.description : row.description,
    status: payload.status ?? row.status,
    updated_by: actorId,
  });
  return getTemplateById(templateId);
}

async function archiveTemplate(templateId, actorId) {
  return updateTemplate(templateId, { status: "archived" }, actorId);
}

async function deleteTemplate(templateId) {
  const inUse = await db.DiagnosisFormConfig.count({
    where: { source_template_id: templateId },
  });
  if (inUse > 0) {
    const err = new Error(
      "Cannot delete template while staff configurations reference it. Archive instead."
    );
    err.status = 400;
    throw err;
  }
  const row = await getTemplateById(templateId);
  await row.destroy();
  return { success: true };
}

async function duplicateTemplate(templateId, { title, actorId }) {
  const source = await getTemplateById(templateId);
  const copy = await db.DiagnosisTemplate.create({
    template_id: uuidv4(),
    title: title || `${source.title} (Copy)`,
    description: source.description,
    status: "active",
    created_by: actorId,
    updated_by: actorId,
  });

  await copyStructure({
    sourceTemplateId: templateId,
    targetTemplateId: copy.template_id,
  });

  return getTemplateById(copy.template_id);
}

async function createGroup(templateId, payload) {
  await getTemplateById(templateId);
  const max = await db.FormFieldGroup.max("sort_order", {
    where: { diagnosis_template_id: templateId },
  });

  return db.FormFieldGroup.create({
    group_id: uuidv4(),
    model_name: DIAGNOSIS_MODEL_NAME,
    diagnosis_template_id: templateId,
    title: payload.title,
    description: payload.description || null,
    sort_order: payload.sort_order ?? (Number(max) || 0) + 1,
    is_visible: payload.is_visible ?? true,
    is_required: payload.is_required ?? false,
  });
}

async function updateGroup(templateId, groupId, payload) {
  const group = await db.FormFieldGroup.findOne({
    where: {
      group_id: groupId,
      diagnosis_template_id: templateId,
      model_name: DIAGNOSIS_MODEL_NAME,
    },
  });
  if (!group) {
    const err = new Error("Form section not found");
    err.status = 404;
    throw err;
  }

  await group.update({
    title: payload.title ?? group.title,
    description:
      payload.description !== undefined ? payload.description : group.description,
    is_visible: payload.is_visible ?? group.is_visible,
    is_required: payload.is_required ?? group.is_required,
    sort_order: payload.sort_order ?? group.sort_order,
  });

  if (payload.title) {
    await db.FormField.update(
      { category: payload.title },
      { where: { group_id: groupId } }
    );
  }

  return group;
}

async function deleteGroup(templateId, groupId) {
  const group = await db.FormFieldGroup.findOne({
    where: { group_id: groupId, diagnosis_template_id: templateId },
    include: [{ model: db.FormField, as: "fields" }],
  });
  if (!group) {
    const err = new Error("Form section not found");
    err.status = 404;
    throw err;
  }
  if ((group.fields || []).length > 0) {
    const err = new Error("Remove all fields from this section before deleting it");
    err.status = 400;
    throw err;
  }
  await group.destroy();
  return { success: true };
}

async function reorderGroups(templateId, groupIds) {
  await getTemplateById(templateId);
  const t = await db.sequelize.transaction();
  try {
    for (let i = 0; i < groupIds.length; i++) {
      await db.FormFieldGroup.update(
        { sort_order: i },
        {
          where: { group_id: groupIds[i], diagnosis_template_id: templateId },
          transaction: t,
        }
      );
    }
    await t.commit();
    return getGroupsByTemplate(templateId);
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

async function createField(templateId, payload) {
  await getTemplateById(templateId);
  const group = await getGroupForField(
    DIAGNOSIS_MODEL_NAME,
    payload.group_id,
    null,
    templateId
  );

  assertFieldKeyForStorage(payload.field_key, "custom");
  await ensureUniqueFieldKeyForTemplate(
    DIAGNOSIS_MODEL_NAME,
    payload.field_key,
    templateId
  );

  const max = await db.FormField.max("sort_order", {
    where: { group_id: group.group_id },
  });

  const field = await db.FormField.create({
    field_id: uuidv4(),
    model_name: DIAGNOSIS_MODEL_NAME,
    diagnosis_template_id: templateId,
    group_id: group.group_id,
    field_key: payload.field_key,
    label: payload.label,
    field_type: payload.field_type,
    storage_type: "custom",
    category: payload.category || group.title,
    is_required: payload.is_required ?? false,
    is_visible: payload.is_visible ?? true,
    sort_order: payload.sort_order ?? (Number(max) || 0) + 1,
    config: payload.config || {},
  });

  await syncGroupRequiredFromFields(group.group_id);
  return normalizeFieldRecord(field.get({ plain: true }));
}

async function updateField(templateId, fieldId, payload) {
  const field = await db.FormField.findOne({
    where: {
      field_id: fieldId,
      diagnosis_template_id: templateId,
      model_name: DIAGNOSIS_MODEL_NAME,
    },
  });
  if (!field) {
    const err = new Error("Field not found");
    err.status = 404;
    throw err;
  }

  if (payload.field_key && payload.field_key !== field.field_key) {
    await ensureUniqueFieldKeyForTemplate(
      DIAGNOSIS_MODEL_NAME,
      payload.field_key,
      templateId,
      fieldId
    );
  }

  let groupId = field.group_id;
  if (payload.group_id && payload.group_id !== field.group_id) {
    await getGroupForField(DIAGNOSIS_MODEL_NAME, payload.group_id, null, templateId);
    groupId = payload.group_id;
  }

  await field.update({
    field_key: payload.field_key ?? field.field_key,
    label: payload.label ?? field.label,
    field_type: payload.field_type ?? field.field_type,
    group_id: groupId,
    category: payload.category ?? field.category,
    is_required: payload.is_required ?? field.is_required,
    is_visible: payload.is_visible ?? field.is_visible,
    sort_order: payload.sort_order ?? field.sort_order,
    config: payload.config !== undefined ? payload.config : field.config,
  });

  await syncGroupRequiredFromFields(groupId);
  return normalizeFieldRecord(field.get({ plain: true }));
}

async function deleteField(templateId, fieldId) {
  const field = await db.FormField.findOne({
    where: { field_id: fieldId, diagnosis_template_id: templateId },
  });
  if (!field) {
    const err = new Error("Field not found");
    err.status = 404;
    throw err;
  }
  const groupId = field.group_id;
  await field.destroy();
  await syncGroupRequiredFromFields(groupId);
  return { success: true };
}

async function reorderFields(templateId, fieldIds) {
  await getTemplateById(templateId);
  const t = await db.sequelize.transaction();
  try {
    for (let i = 0; i < fieldIds.length; i++) {
      await db.FormField.update(
        { sort_order: i },
        {
          where: {
            field_id: fieldIds[i],
            diagnosis_template_id: templateId,
          },
          transaction: t,
        }
      );
    }
    await t.commit();
    return getGroupedFormForTemplate(templateId);
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

module.exports = {
  listTemplates,
  getTemplateById,
  getGroupedFormForTemplate,
  createTemplate,
  updateTemplate,
  archiveTemplate,
  deleteTemplate,
  duplicateTemplate,
  createGroup,
  updateGroup,
  deleteGroup,
  reorderGroups,
  createField,
  updateField,
  deleteField,
  reorderFields,
};
