"use strict";

const { FormField } = require("../../models");
const { v4: uuidv4 } = require("uuid");
const {
  getFormFieldsByModel,
  getUserFormConfig,
  normalizeFieldRecord,
  groupFormFields,
  assertFieldKeyForStorage,
  ensureUniqueFieldKey,
  reorderFormFields,
} = require("../../services/formFieldService");
const { ensureCoreFormFields } = require("../../services/coreFormFieldService");
const { isCoreFormField } = require("../../config/coreUserFormFields");
const { USER_MODEL_NAME } = require("../../config/userFormConstants");

const getFormFields = async (req, res) => {
  try {
    const model = req.query.model || USER_MODEL_NAME;
    const visibleOnly = req.query.visible_only === "true";
    const grouped = req.query.grouped !== "false";

    if (model === USER_MODEL_NAME) {
      await ensureCoreFormFields();
    }

    const fields = await getFormFieldsByModel(model, { visibleOnly });

    if (grouped) {
      const groupedData = groupFormFields(fields);
      return res.json({ success: true, data: groupedData });
    }

    return res.json({
      success: true,
      data: fields.map(normalizeFieldRecord),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getUserFormConfigHandler = async (req, res) => {
  try {
    const model = req.query.model || USER_MODEL_NAME;
    if (model !== USER_MODEL_NAME) {
      return res.status(400).json({
        success: false,
        message: `Form config not supported for model: ${model}`,
      });
    }

    await ensureCoreFormFields();
    const fields = await getUserFormConfig();
    const grouped = groupFormFields(fields);

    return res.json({
      success: true,
      data: grouped,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createFormField = async (req, res) => {
  try {
    const {
      model_name = USER_MODEL_NAME,
      field_key,
      label,
      field_type,
      category = "General",
      is_required = false,
      is_visible = true,
      sort_order,
      config = {},
    } = req.body;

    const storage_type = "custom";

    assertFieldKeyForStorage(field_key, storage_type);
    await ensureUniqueFieldKey(model_name, field_key);

    let order = sort_order;
    if (order === undefined) {
      const max = await FormField.max("sort_order", {
        where: { model_name, category },
      });
      order = (max ?? -1) + 1;
    }

    const field = await FormField.create({
      field_id: uuidv4(),
      model_name,
      field_key,
      label,
      field_type,
      storage_type,
      category,
      is_required,
      is_visible,
      sort_order: order,
      config,
    });

    return res.status(201).json({
      success: true,
      message: "Form field created",
      data: normalizeFieldRecord(field),
    });
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};

const updateFormField = async (req, res) => {
  try {
    const { id } = req.params;
    const field = await FormField.findByPk(id);

    if (!field) {
      return res.status(404).json({ success: false, message: "Field not found" });
    }

    const updates = { ...req.body, updated_at: new Date() };
    delete updates.storage_type;

    if (isCoreFormField(field)) {
      delete updates.field_key;
      delete updates.category;
      updates.is_required = true;
      updates.is_visible = true;
    } else {
      const nextKey = updates.field_key ?? field.field_key;
      assertFieldKeyForStorage(nextKey, "custom");
      if (updates.field_key && updates.field_key !== field.field_key) {
        await ensureUniqueFieldKey(field.model_name, updates.field_key, id);
      }
    }

    await field.update(updates);

    return res.json({
      success: true,
      message: "Form field updated",
      data: normalizeFieldRecord(field),
    });
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};

const deleteFormField = async (req, res) => {
  try {
    const { id } = req.params;
    const field = await FormField.findByPk(id);

    if (!field) {
      return res.status(404).json({ success: false, message: "Field not found" });
    }

    if (isCoreFormField(field)) {
      return res.status(403).json({
        success: false,
        message: "Core fields (full_name, email, phone_number) cannot be deleted",
      });
    }

    await field.destroy();

    return res.json({ success: true, message: "Form field deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const reorderFormFieldsHandler = async (req, res) => {
  try {
    const { model_name = USER_MODEL_NAME, field_ids } = req.body;
    const fields = await reorderFormFields(model_name, field_ids);
    const grouped = groupFormFields(fields);

    return res.json({
      success: true,
      message: "Fields reordered",
      data: grouped,
    });
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};

module.exports = {
  getFormFields,
  getUserFormConfig: getUserFormConfigHandler,
  createFormField,
  updateFormField,
  deleteFormField,
  reorderFormFields: reorderFormFieldsHandler,
};
