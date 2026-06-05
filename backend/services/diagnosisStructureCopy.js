"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const { DIAGNOSIS_MODEL_NAME } = require("../config/diagnosisFormConstants");
const {
  DEFAULT_DIAGNOSIS_GROUPS,
  DEFAULT_DIAGNOSIS_FIELDS,
  getTemplatePresetByTitle,
} = require("../config/diagnosisFormCatalog");

async function loadSourceGroups({ templateId, configId, visibleOnly = false, transaction }) {
  const where = { model_name: DIAGNOSIS_MODEL_NAME };
  if (templateId) where.diagnosis_template_id = templateId;
  else if (configId) where.diagnosis_config_id = configId;
  else {
    const err = new Error("templateId or configId required");
    err.status = 400;
    throw err;
  }
  if (visibleOnly) where.is_visible = true;

  return db.FormFieldGroup.findAll({
    where,
    include: [
      {
        model: db.FormField,
        as: "fields",
        required: false,
      },
    ],
    order: [
      ["sort_order", "ASC"],
      [{ model: db.FormField, as: "fields" }, "sort_order", "ASC"],
    ],
    transaction,
  });
}

async function resolveFieldConfig(config = {}, transaction) {
  const resolved = { ...config };
  if (resolved.diagram_code && !resolved.diagram_id) {
    const diagram = await db.MedicalDiagram.findOne({
      where: { code: resolved.diagram_code },
      transaction,
    });
    if (diagram) {
      resolved.diagram_id = diagram.diagram_id;
      resolved.canvas_source_type = resolved.canvas_source_type || "library";
    }
    delete resolved.diagram_code;
  }
  return resolved;
}

async function seedDefaultStructureToTarget({
  templateId,
  configId,
  templateTitle,
  transaction,
}) {
  const preset = getTemplatePresetByTitle(templateTitle);
  const groupsToSeed = preset?.groups || DEFAULT_DIAGNOSIS_GROUPS;
  const fieldsToSeed = preset?.fields || DEFAULT_DIAGNOSIS_FIELDS;
  const groupByTitle = new Map();
  for (const g of groupsToSeed) {
    const group = await db.FormFieldGroup.create(
      {
        group_id: uuidv4(),
        model_name: DIAGNOSIS_MODEL_NAME,
        diagnosis_template_id: templateId || null,
        diagnosis_config_id: configId || null,
        title: g.title,
        description: g.description,
        sort_order: g.sort_order,
        is_visible: g.is_visible,
        is_required: g.is_required,
      },
      { transaction }
    );
    groupByTitle.set(g.title, group);
  }

  for (const def of fieldsToSeed) {
    const group = groupByTitle.get(def.section);
    if (!group) continue;
    await db.FormField.create(
      {
        field_id: uuidv4(),
        model_name: DIAGNOSIS_MODEL_NAME,
        diagnosis_template_id: templateId || null,
        diagnosis_config_id: configId || null,
        group_id: group.group_id,
        field_key: def.field_key,
        label: def.label,
        field_type: def.field_type,
        storage_type: "custom",
        category: def.section,
        is_required: Boolean(def.is_required),
        is_visible: true,
        sort_order: def.sort_order ?? 0,
        config: await resolveFieldConfig(def.config || {}, transaction),
      },
      { transaction }
    );
  }
}

async function copyStructure({
  sourceTemplateId,
  sourceConfigId,
  targetTemplateId,
  targetConfigId,
  transaction,
}) {
  if (!targetTemplateId && !targetConfigId) {
    const err = new Error("Target template or config required");
    err.status = 400;
    throw err;
  }

  const groups = await loadSourceGroups({
    templateId: sourceTemplateId,
    configId: sourceConfigId,
    transaction,
  });

  for (const srcGroup of groups) {
    const plainG = srcGroup.get({ plain: true });
    const newGroupId = uuidv4();
    await db.FormFieldGroup.create(
      {
        group_id: newGroupId,
        model_name: DIAGNOSIS_MODEL_NAME,
        diagnosis_template_id: targetTemplateId || null,
        diagnosis_config_id: targetConfigId || null,
        title: plainG.title,
        description: plainG.description,
        sort_order: plainG.sort_order,
        is_visible: plainG.is_visible,
        is_required: plainG.is_required,
      },
      { transaction }
    );

    for (const srcField of plainG.fields || []) {
      await db.FormField.create(
        {
          field_id: uuidv4(),
          model_name: DIAGNOSIS_MODEL_NAME,
          diagnosis_template_id: targetTemplateId || null,
          diagnosis_config_id: targetConfigId || null,
          group_id: newGroupId,
          field_key: srcField.field_key,
          label: srcField.label,
          field_type: srcField.field_type,
          storage_type: "custom",
          category: srcField.category || plainG.title,
          is_required: srcField.is_required,
          is_visible: srcField.is_visible,
          sort_order: srcField.sort_order,
          config: srcField.config || {},
        },
        { transaction }
      );
    }
  }
}

async function clearTargetStructure({ templateId, configId, transaction }) {
  const fieldWhere = { model_name: DIAGNOSIS_MODEL_NAME };
  const groupWhere = { model_name: DIAGNOSIS_MODEL_NAME };
  if (templateId) {
    fieldWhere.diagnosis_template_id = templateId;
    groupWhere.diagnosis_template_id = templateId;
  } else {
    fieldWhere.diagnosis_config_id = configId;
    groupWhere.diagnosis_config_id = configId;
  }
  await db.FormField.destroy({ where: fieldWhere, transaction });
  await db.FormFieldGroup.destroy({ where: groupWhere, transaction });
}

module.exports = {
  loadSourceGroups,
  seedDefaultStructureToTarget,
  copyStructure,
  clearTargetStructure,
};
