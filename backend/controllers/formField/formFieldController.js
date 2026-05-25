"use strict";

const { FormField, FormFieldGroup } = require("../../models");
const { v4: uuidv4 } = require("uuid");
const {
  getGroupedFormConfig,
  normalizeFieldRecord,
  assertFieldKeyForStorage,
  ensureUniqueFieldKey,
  getGroupForField,
  reorderFormFields,
  syncGroupRequiredFromFields,
} = require("../../services/formFieldService");
const { ensureCoreFormFields } = require("../../services/coreFormFieldService");
const { isCoreFormField } = require("../../config/corePatientFormFields");
const { PATIENT_MODEL_NAME } = require("../../config/userFormConstants");

const getFormFields = async (req, res) => {
  try {
    const model = req.query.model || PATIENT_MODEL_NAME;
    const visibleOnly = req.query.visible_only === "true";
    const grouped = req.query.grouped !== "false";

    if (model === PATIENT_MODEL_NAME) {
      await ensureCoreFormFields();
    }

    const data = await getGroupedFormConfig(model, { visibleOnly });

    if (grouped) {
      return res.json({ success: true, data });
    }

    return res.json({
      success: true,
      data: data.fields.map(normalizeFieldRecord),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getUserFormConfigHandler = async (req, res) => {
  try {
    const model = req.query.model || PATIENT_MODEL_NAME;
    if (model !== PATIENT_MODEL_NAME) {
      return res.status(400).json({
        success: false,
        message: `Form config not supported for model: ${model}`,
      });
    }

    await ensureCoreFormFields();
    const data = await getGroupedFormConfig(model, { visibleOnly: true });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createFormField = async (req, res) => {
  try {
    const {
      model_name = PATIENT_MODEL_NAME,
      group_id,
      field_key,
      label,
      field_type,
      is_required = false,
      is_visible = true,
      sort_order,
      config = {},
    } = req.body;

    const storage_type = "custom";
    const group = await getGroupForField(model_name, group_id);

    assertFieldKeyForStorage(field_key, storage_type);
    await ensureUniqueFieldKey(model_name, field_key);

    let order = sort_order;
    if (order === undefined) {
      const max = await FormField.max("sort_order", {
        where: { group_id },
      });
      order = (max ?? -1) + 1;
    }

    const field = await FormField.create({
      field_id: uuidv4(),
      model_name,
      group_id,
      field_key,
      label,
      field_type,
      storage_type,
      category: group.title,
      is_required,
      is_visible,
      sort_order: order,
      config,
    });

    await syncGroupRequiredFromFields(group_id);

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

    if (updates.group_id) {
      const group = await getGroupForField(field.model_name, updates.group_id);
      updates.category = group.title;
    }

    if (isCoreFormField(field)) {
      delete updates.field_key;
      delete updates.group_id;
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
    await syncGroupRequiredFromFields(field.group_id);
    if (updates.group_id && updates.group_id !== field.group_id) {
      await syncGroupRequiredFromFields(updates.group_id);
    }

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

    const groupId = field.group_id;
    await field.destroy();
    await syncGroupRequiredFromFields(groupId);

    return res.json({ success: true, message: "Form field deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const reorderFormFieldsHandler = async (req, res) => {
  try {
    const { model_name = PATIENT_MODEL_NAME, field_ids } = req.body;
    const data = await reorderFormFields(model_name, field_ids);

    return res.json({
      success: true,
      message: "Fields reordered",
      data,
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
