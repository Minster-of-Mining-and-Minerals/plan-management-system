"use strict";

const medicalDiagramCategoryService = require("../../services/medicalDiagramCategoryService");

const handle = async (res, fn, status = 200) => {
  try {
    const data = await fn();
    return res.status(status).json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

exports.list = (req, res) =>
  handle(res, () =>
    medicalDiagramCategoryService.list({
      status: req.query.status,
      includeInactive: req.query.include_inactive === "true",
    })
  );

exports.getById = (req, res) =>
  handle(res, () =>
    medicalDiagramCategoryService.getById(req.params.categoryId)
  );

exports.create = (req, res) =>
  handle(
    res,
    () => medicalDiagramCategoryService.create(req.body, req.user.user_id),
    201
  );

exports.update = (req, res) =>
  handle(res, () =>
    medicalDiagramCategoryService.update(
      req.params.categoryId,
      req.body,
      req.user.user_id
    )
  );

exports.remove = (req, res) =>
  handle(res, () =>
    medicalDiagramCategoryService.remove(req.params.categoryId)
  );
