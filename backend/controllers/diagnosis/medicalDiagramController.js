"use strict";

const medicalDiagramService = require("../../services/medicalDiagramService");
const medicalDiagramCategoryService = require("../../services/medicalDiagramCategoryService");

const list = async (req, res) => {
  try {
    const includeInactive = req.query.include_inactive === "true";
    const rows = await medicalDiagramService.listDiagrams({
      status: req.query.status,
      includeInactive,
    });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const getMeta = async (_req, res) => {
  try {
    const categories = await medicalDiagramCategoryService.list();
    return res.json({ success: true, data: { categories } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const getById = async (req, res) => {
  try {
    const row = await medicalDiagramService.getDiagramById(req.params.diagramId);
    return res.json({ success: true, data: row });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const create = async (req, res) => {
  try {
    const row = await medicalDiagramService.createDiagram(
      req.body,
      req.user.user_id
    );
    return res.status(201).json({ success: true, data: row });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const update = async (req, res) => {
  try {
    const row = await medicalDiagramService.updateDiagram(
      req.params.diagramId,
      req.body,
      req.user.user_id
    );
    return res.json({ success: true, data: row });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const remove = async (req, res) => {
  try {
    await medicalDiagramService.deleteDiagram(req.params.diagramId);
    return res.json({ success: true, message: "Medical diagram deleted" });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const seedDefaults = async (req, res) => {
  try {
    const result = await medicalDiagramService.seedDefaultDiagramsIfEmpty(
      req.user.user_id
    );
    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = {
  list,
  getMeta,
  getById,
  create,
  update,
  remove,
  seedDefaults,
};
