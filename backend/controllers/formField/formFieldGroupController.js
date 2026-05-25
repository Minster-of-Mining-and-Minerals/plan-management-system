"use strict";

const {
  getGroupsByModel,
  normalizeGroupRecord,
  buildGroupedFormResponse,
  createFormFieldGroup,
  updateFormFieldGroup,
  deleteFormFieldGroup,
  reorderFormFieldGroups,
} = require("../../services/formFieldGroupService");
const { PATIENT_MODEL_NAME } = require("../../config/userFormConstants");

const getFormFieldGroups = async (req, res) => {
  try {
    const model = req.query.model || PATIENT_MODEL_NAME;
    const visibleOnly = req.query.visible_only === "true";
    const groups = await getGroupsByModel(model, { visibleOnly });
    const data = buildGroupedFormResponse(groups);

    return res.json({ success: true, data: data.groups });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createFormFieldGroupHandler = async (req, res) => {
  try {
    const group = await createFormFieldGroup(req.body);
    const full = await getGroupsByModel(group.model_name);
    const found = full.find((g) => g.group_id === group.group_id);

    return res.status(201).json({
      success: true,
      message: "Form field group created",
      data: normalizeGroupRecord(found || group),
    });
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};

const updateFormFieldGroupHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await updateFormFieldGroup(id, req.body);

    return res.json({
      success: true,
      message: "Form field group updated",
      data: normalizeGroupRecord(group),
    });
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};

const deleteFormFieldGroupHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteFormFieldGroup(id);

    return res.json({ success: true, message: "Form field group deleted" });
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};

const reorderFormFieldGroupsHandler = async (req, res) => {
  try {
    const { model_name = PATIENT_MODEL_NAME, group_ids } = req.body;
    const groups = await reorderFormFieldGroups(model_name, group_ids);
    const data = buildGroupedFormResponse(groups);

    return res.json({
      success: true,
      message: "Groups reordered",
      data: data.groups,
    });
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};

module.exports = {
  getFormFieldGroups,
  createFormFieldGroup: createFormFieldGroupHandler,
  updateFormFieldGroup: updateFormFieldGroupHandler,
  deleteFormFieldGroup: deleteFormFieldGroupHandler,
  reorderFormFieldGroups: reorderFormFieldGroupsHandler,
};
