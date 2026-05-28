"use strict";

const diagnosisTemplateService = require("../../services/diagnosisTemplateService");

const list = async (req, res) => {
  try {
    const includeArchived = req.query.include_archived === "true";
    const rows = await diagnosisTemplateService.listTemplates({
      status: req.query.status,
      includeArchived,
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
    const row = await diagnosisTemplateService.getTemplateById(req.params.templateId);
    return res.json({ success: true, data: row.get({ plain: true }) });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const getFormConfig = async (req, res) => {
  try {
    const data = await diagnosisTemplateService.getGroupedFormForTemplate(
      req.params.templateId,
      { visibleOnly: req.query.visible_only === "true" }
    );
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const create = async (req, res) => {
  try {
    const row = await diagnosisTemplateService.createTemplate({
      title: req.body.title,
      description: req.body.description,
      seedDefaults: req.body.seed_defaults !== false,
      actorId: req.user.user_id,
    });
    return res.status(201).json({ success: true, data: row.get({ plain: true }) });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const update = async (req, res) => {
  try {
    const row = await diagnosisTemplateService.updateTemplate(
      req.params.templateId,
      req.body,
      req.user.user_id
    );
    return res.json({ success: true, data: row.get({ plain: true }) });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const archive = async (req, res) => {
  try {
    const row = await diagnosisTemplateService.archiveTemplate(
      req.params.templateId,
      req.user.user_id
    );
    return res.json({ success: true, data: row.get({ plain: true }) });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const remove = async (req, res) => {
  try {
    await diagnosisTemplateService.deleteTemplate(req.params.templateId);
    return res.json({ success: true });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const duplicate = async (req, res) => {
  try {
    const row = await diagnosisTemplateService.duplicateTemplate(
      req.params.templateId,
      { title: req.body.title, actorId: req.user.user_id }
    );
    return res.status(201).json({ success: true, data: row.get({ plain: true }) });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const createGroup = async (req, res) => {
  try {
    const row = await diagnosisTemplateService.createGroup(
      req.params.templateId,
      req.body
    );
    return res.status(201).json({ success: true, data: row.get({ plain: true }) });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    const row = await diagnosisTemplateService.updateGroup(
      req.params.templateId,
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
    await diagnosisTemplateService.deleteGroup(
      req.params.templateId,
      req.params.groupId
    );
    return res.json({ success: true });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const reorderGroups = async (req, res) => {
  try {
    const rows = await diagnosisTemplateService.reorderGroups(
      req.params.templateId,
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
    const data = await diagnosisTemplateService.createField(
      req.params.templateId,
      req.body
    );
    return res.status(201).json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const updateField = async (req, res) => {
  try {
    const data = await diagnosisTemplateService.updateField(
      req.params.templateId,
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
    await diagnosisTemplateService.deleteField(
      req.params.templateId,
      req.params.fieldId
    );
    return res.json({ success: true });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const reorderFields = async (req, res) => {
  try {
    const data = await diagnosisTemplateService.reorderFields(
      req.params.templateId,
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
  create,
  update,
  archive,
  remove,
  duplicate,
  createGroup,
  updateGroup,
  deleteGroup,
  reorderGroups,
  createField,
  updateField,
  deleteField,
  reorderFields,
};
