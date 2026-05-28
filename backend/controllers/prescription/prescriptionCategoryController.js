"use strict";

const prescriptionCategoryService = require("../../services/prescriptionCategoryService");

const handle = async (res, fn) => {
  try {
    const data = await fn();
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

exports.list = (req, res) =>
  handle(res, () =>
    prescriptionCategoryService.list({
      status: req.query.status,
      search: req.query.search,
    })
  );

exports.getById = (req, res) =>
  handle(res, () => prescriptionCategoryService.getById(req.params.categoryId));

exports.create = async (req, res) => {
  try {
    const data = await prescriptionCategoryService.create(req.body, req.user.user_id);
    return res.status(201).json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

exports.update = (req, res) =>
  handle(res, () =>
    prescriptionCategoryService.update(req.params.categoryId, req.body, req.user.user_id)
  );

exports.remove = (req, res) =>
  handle(res, () => prescriptionCategoryService.remove(req.params.categoryId));
