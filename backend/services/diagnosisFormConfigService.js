"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const { DIAGNOSIS_MODEL_NAME } = require("../config/diagnosisFormConstants");
const {
  copyStructure,
  clearTargetStructure,
} = require("./diagnosisStructureCopy");
const diagnosisTemplateService = require("./diagnosisTemplateService");
const {
  buildGroupedFormResponse,
  syncGroupRequiredFromFields,
} = require("./formFieldGroupService");
const { normalizeFieldRecord } = require("./formFieldNormalize");
const {
  assertFieldKeyForStorage,
  ensureUniqueFieldKeyForConfig,
  getGroupForField,
} = require("./formFieldService");

async function listConfigs({ staffId } = {}) {
  const where = {};
  if (staffId) where.assigned_staff_id = staffId;

  return db.DiagnosisFormConfig.findAll({
    where,
    include: [
      {
        model: db.User,
        as: "staff",
        attributes: ["user_id", "full_name", "email"],
      },
    ],
    order: [
      ["sort_order", "ASC"],
      ["created_at", "ASC"],
    ],
  });
}

async function getNextSortOrderForStaff(staffId) {
  const max = await db.DiagnosisFormConfig.max("sort_order", {
    where: { assigned_staff_id: staffId },
  });
  return (Number(max) || 0) + 1;
}

async function assertConfigBelongsToStaff(configId, staffId) {
  const config = await db.DiagnosisFormConfig.findOne({
    where: { config_id: configId, assigned_staff_id: staffId, is_active: true },
  });
  if (!config) {
    const err = new Error("Diagnosis form not found or not assigned to this staff member");
    err.status = 400;
    throw err;
  }
  return config;
}

async function getConfigById(configId) {
  const row = await db.DiagnosisFormConfig.findByPk(configId, {
    include: [
      {
        model: db.User,
        as: "staff",
        attributes: ["user_id", "full_name", "email"],
      },
    ],
  });
  if (!row) {
    const err = new Error("Diagnosis form configuration not found");
    err.status = 404;
    throw err;
  }
  return row;
}

async function createConfigForStaff(
  assignedStaffId,
  { title, description, sourceTemplateId, actorId } = {}
) {
  if (!sourceTemplateId) {
    const err = new Error("Diagnosis form must be created from a template");
    err.status = 400;
    throw err;
  }

  const sortOrder = await getNextSortOrderForStaff(assignedStaffId);
  const t = await db.sequelize.transaction();
  try {
    const template = sourceTemplateId
      ? await diagnosisTemplateService.getTemplateById(sourceTemplateId)
      : null;

    const config = await db.DiagnosisFormConfig.create(
      {
        config_id: uuidv4(),
        assigned_staff_id: assignedStaffId,
        title: title || template?.title || "Diagnosis Form",
        description: description ?? template?.description ?? null,
        source_template_id: sourceTemplateId || null,
        is_active: true,
        sort_order: sortOrder,
        created_by: actorId,
        updated_by: actorId,
      },
      { transaction: t }
    );

    if (sourceTemplateId) {
      await copyStructure({
        sourceTemplateId,
        targetConfigId: config.config_id,
        transaction: t,
      });
    }

    await t.commit();
    return getConfigById(config.config_id);
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

async function updateConfigMeta(configId, payload, actorId) {
  const config = await getConfigById(configId);
  await config.update({
    title: payload.title ?? config.title,
    description:
      payload.description !== undefined ? payload.description : config.description,
    is_active: payload.is_active ?? config.is_active,
    updated_by: actorId,
  });
  return getConfigById(configId);
}

async function deleteConfig(configId) {
  const config = await getConfigById(configId);
  await config.destroy();
  return { success: true };
}

async function getGroupsByConfig(configId, { visibleOnly = false } = {}) {
  const where = {
    model_name: DIAGNOSIS_MODEL_NAME,
    diagnosis_config_id: configId,
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

async function getGroupedFormConfigForConfig(configId, { visibleOnly = false } = {}) {
  const groups = await getGroupsByConfig(configId, { visibleOnly });
  return buildGroupedFormResponse(groups);
}

async function getConfigsForStaff(staffId, { visibleOnly = true } = {}) {
  const configs = await db.DiagnosisFormConfig.findAll({
    where: { assigned_staff_id: staffId, is_active: true },
    include: [
      {
        model: db.DiagnosisTemplate,
        as: "sourceTemplate",
        attributes: ["template_id", "title", "description", "status"],
      },
    ],
    order: [
      ["sort_order", "ASC"],
      ["created_at", "ASC"],
    ],
  });

  const forms = await Promise.all(
    configs.map(async (config) => {
      const grouped = await getGroupedFormConfigForConfig(config.config_id, {
        visibleOnly,
      });
      return {
        config: config.get({ plain: true }),
        form: grouped,
      };
    })
  );

  return forms;
}

/** First active form (backward compatible default). */
async function getConfigForStaff(staffId) {
  const forms = await getConfigsForStaff(staffId);
  if (!forms.length) {
    return { config: null, form: null };
  }
  return forms[0];
}

async function assignTemplateToStaff(
  staffId,
  templateId,
  { replaceExisting = false, configId, title, description, actorId } = {}
) {
  const template = await diagnosisTemplateService.getTemplateById(templateId);

  const t = await db.sequelize.transaction();
  try {
    let config;

    if (replaceExisting) {
      if (configId) {
        config = await db.DiagnosisFormConfig.findOne({
          where: { config_id: configId, assigned_staff_id: staffId },
          transaction: t,
        });
      } else {
        const active = await db.DiagnosisFormConfig.findAll({
          where: { assigned_staff_id: staffId, is_active: true },
          transaction: t,
        });
        if (active.length !== 1) {
          const err = new Error(
            "Specify which form to replace (config_id) when staff has multiple diagnosis forms"
          );
          err.status = 400;
          throw err;
        }
        config = active[0];
      }

      if (!config) {
        const err = new Error("Diagnosis form configuration not found");
        err.status = 404;
        throw err;
      }

      await clearTargetStructure({ configId: config.config_id, transaction: t });
      await config.update(
        {
          title: title || config.title,
          description:
            description !== undefined ? description : config.description,
          source_template_id: templateId,
          updated_by: actorId,
        },
        { transaction: t }
      );
    } else {
      const sortOrder = await getNextSortOrderForStaff(staffId);
      config = await db.DiagnosisFormConfig.create(
        {
          config_id: uuidv4(),
          assigned_staff_id: staffId,
          title: title || template.title,
          description: description ?? template.description,
          source_template_id: templateId,
          is_active: true,
          sort_order: sortOrder,
          created_by: actorId,
          updated_by: actorId,
        },
        { transaction: t }
      );
    }

    await copyStructure({
      sourceTemplateId: templateId,
      targetConfigId: config.config_id,
      transaction: t,
    });

    await t.commit();
    const grouped = await getGroupedFormConfigForConfig(config.config_id, {
      visibleOnly: true,
    });
    return {
      config: (await getConfigById(config.config_id)).get({ plain: true }),
      form: grouped,
    };
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

/** @deprecated Use getConfigForStaff — kept for backward compatibility */
async function getOrCreateConfigForStaff(staffId, actorId) {
  const result = await getConfigForStaff(staffId);
  if (result.config) return result;
  return { config: null, form: null };
}

async function createGroup(configId, payload) {
  await getConfigById(configId);
  const max = await db.FormFieldGroup.max("sort_order", {
    where: { diagnosis_config_id: configId },
  });

  const group = await db.FormFieldGroup.create({
    group_id: uuidv4(),
    model_name: DIAGNOSIS_MODEL_NAME,
    diagnosis_config_id: configId,
    title: payload.title,
    description: payload.description || null,
    sort_order: payload.sort_order ?? (Number(max) || 0) + 1,
    is_visible: payload.is_visible ?? true,
    is_required: payload.is_required ?? false,
  });

  return group;
}

async function updateGroup(configId, groupId, payload) {
  const group = await db.FormFieldGroup.findOne({
    where: {
      group_id: groupId,
      diagnosis_config_id: configId,
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

async function deleteGroup(configId, groupId) {
  const group = await db.FormFieldGroup.findOne({
    where: {
      group_id: groupId,
      diagnosis_config_id: configId,
    },
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

async function reorderGroups(configId, groupIds) {
  await getConfigById(configId);
  const t = await db.sequelize.transaction();
  try {
    for (let i = 0; i < groupIds.length; i++) {
      await db.FormFieldGroup.update(
        { sort_order: i },
        {
          where: {
            group_id: groupIds[i],
            diagnosis_config_id: configId,
          },
          transaction: t,
        }
      );
    }
    await t.commit();
    return getGroupsByConfig(configId);
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

async function createField(configId, payload) {
  await getConfigById(configId);
  const group = await getGroupForField(DIAGNOSIS_MODEL_NAME, payload.group_id, configId);

  assertFieldKeyForStorage(payload.field_key, "custom");
  await ensureUniqueFieldKeyForConfig(
    DIAGNOSIS_MODEL_NAME,
    payload.field_key,
    configId
  );

  const max = await db.FormField.max("sort_order", {
    where: { group_id: group.group_id },
  });

  const field = await db.FormField.create({
    field_id: uuidv4(),
    model_name: DIAGNOSIS_MODEL_NAME,
    diagnosis_config_id: configId,
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

async function updateField(configId, fieldId, payload) {
  const field = await db.FormField.findOne({
    where: {
      field_id: fieldId,
      diagnosis_config_id: configId,
      model_name: DIAGNOSIS_MODEL_NAME,
    },
  });
  if (!field) {
    const err = new Error("Field not found");
    err.status = 404;
    throw err;
  }

  if (payload.field_key && payload.field_key !== field.field_key) {
    await ensureUniqueFieldKeyForConfig(
      DIAGNOSIS_MODEL_NAME,
      payload.field_key,
      configId,
      fieldId
    );
  }

  let groupId = field.group_id;
  if (payload.group_id && payload.group_id !== field.group_id) {
    await getGroupForField(DIAGNOSIS_MODEL_NAME, payload.group_id, configId);
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

async function deleteField(configId, fieldId) {
  const field = await db.FormField.findOne({
    where: {
      field_id: fieldId,
      diagnosis_config_id: configId,
    },
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

async function reorderFields(configId, fieldIds) {
  await getConfigById(configId);
  const t = await db.sequelize.transaction();
  try {
    for (let i = 0; i < fieldIds.length; i++) {
      await db.FormField.update(
        { sort_order: i },
        {
          where: {
            field_id: fieldIds[i],
            diagnosis_config_id: configId,
          },
          transaction: t,
        }
      );
    }
    await t.commit();
    return getGroupedFormConfigForConfig(configId);
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

module.exports = {
  listConfigs,
  getConfigById,
  createConfigForStaff,
  updateConfigMeta,
  deleteConfig,
  getGroupsByConfig,
  getGroupedFormConfigForConfig,
  getConfigForStaff,
  getConfigsForStaff,
  assertConfigBelongsToStaff,
  assignTemplateToStaff,
  getOrCreateConfigForStaff,
  createGroup,
  updateGroup,
  deleteGroup,
  reorderGroups,
  createField,
  updateField,
  deleteField,
  reorderFields,
};
