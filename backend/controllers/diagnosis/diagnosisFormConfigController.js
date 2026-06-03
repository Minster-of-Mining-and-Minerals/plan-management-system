"use strict";

const diagnosisFormConfigService = require("../../services/diagnosisFormConfigService");

const list = async (req, res) => {
  try {
    const staffId = req.query.staff_id;
    const rows = await diagnosisFormConfigService.listConfigs({
      staffId: staffId || undefined,
    });
    return res.json({
      success: true,
      data: rows.map((r) => r.get({ plain: true })),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const getById = async (req, res) => {
  try {
    const row = await diagnosisFormConfigService.getConfigById(req.params.configId);
    return res.json({ success: true, data: row.get({ plain: true }) });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const getFormConfig = async (req, res) => {
  try {
    const data = await diagnosisFormConfigService.getGroupedFormConfigForConfig(
      req.params.configId,
      { visibleOnly: req.query.visible_only === "true" }
    );
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const getByStaff = async (req, res) => {
  try {
    const data = await diagnosisFormConfigService.getConfigForStaff(
      req.params.staffId
    );
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const listByStaff = async (req, res) => {
  try {
    const data = await diagnosisFormConfigService.getConfigsForStaff(
      req.params.staffId
    );
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const assignTemplate = async (req, res) => {
  try {
    const data = await diagnosisFormConfigService.assignTemplateToStaff(
      req.params.staffId,
      req.body.template_id,
      {
        replaceExisting: req.body.replace_existing === true,
        configId: req.body.config_id,
        title: req.body.title,
        description: req.body.description,
        actorId: req.user.user_id,
      }
    );
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const create = async (req, res) => {
  try {
    const row = await diagnosisFormConfigService.createConfigForStaff(
      req.body.assigned_staff_id,
      {
        title: req.body.title,
        description: req.body.description,
        sourceTemplateId: req.body.source_template_id,
        actorId: req.user.user_id,
      }
    );
    return res.status(201).json({ success: true, data: row.get({ plain: true }) });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const update = async (req, res) => {
  try {
    const row = await diagnosisFormConfigService.updateConfigMeta(
      req.params.configId,
      req.body,
      req.user.user_id
    );
    return res.json({ success: true, data: row.get({ plain: true }) });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const remove = async (req, res) => {
  try {
    await diagnosisFormConfigService.deleteConfig(req.params.configId);
    return res.json({ success: true });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const createGroup = async (req, res) => {
  try {
    const row = await diagnosisFormConfigService.createGroup(
      req.params.configId,
      req.body
    );
    return res.status(201).json({ success: true, data: row.get({ plain: true }) });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    const row = await diagnosisFormConfigService.updateGroup(
      req.params.configId,
      req.params.groupId,
      req.body
    );
    return res.json({ success: true, data: row.get({ plain: true }) });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    await diagnosisFormConfigService.deleteGroup(
      req.params.configId,
      req.params.groupId
    );
    return res.json({ success: true });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const reorderGroups = async (req, res) => {
  try {
    const rows = await diagnosisFormConfigService.reorderGroups(
      req.params.configId,
      req.body.ids
    );
    return res.json({
      success: true,
      data: rows.map((r) => r.get({ plain: true })),
    });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const createField = async (req, res) => {
  try {
    const data = await diagnosisFormConfigService.createField(
      req.params.configId,
      req.body
    );
    return res.status(201).json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const updateField = async (req, res) => {
  try {
    const data = await diagnosisFormConfigService.updateField(
      req.params.configId,
      req.params.fieldId,
      req.body
    );
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const deleteField = async (req, res) => {
  try {
    await diagnosisFormConfigService.deleteField(
      req.params.configId,
      req.params.fieldId
    );
    return res.json({ success: true });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const reorderFields = async (req, res) => {
  try {
    const data = await diagnosisFormConfigService.reorderFields(
      req.params.configId,
      req.body.ids
    );
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

module.exports = {
  list,
  getById,
  getFormConfig,
  getByStaff,
  listByStaff,
  assignTemplate,
  create,
  update,
  remove,
  createGroup,
  updateGroup,
  deleteGroup,
  reorderGroups,
  createField,
  updateField,
  deleteField,
  reorderFields,
};
