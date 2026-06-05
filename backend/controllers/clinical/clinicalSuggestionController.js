"use strict";

const clinicalSuggestionService = require("../../services/clinicalSuggestionService");

const handle = async (res, fn, status = 200) => {
  try {
    const data = await fn();
    return res.status(status).json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

exports.search = (req, res) =>
  handle(res, () =>
    clinicalSuggestionService.searchSuggestions({
      query: req.query.q || req.query.query || "",
      category: req.query.category,
      userId: req.user.user_id,
      departmentId: req.query.department_id,
      limit: req.query.limit,
    })
  );

exports.list = (req, res) =>
  handle(res, () =>
    clinicalSuggestionService.listSuggestions({
      category: req.query.category,
      status: req.query.status,
      search: req.query.search,
      department_id: req.query.department_id,
    })
  );

exports.getCategories = (_req, res) =>
  handle(res, () => clinicalSuggestionService.CLINICAL_SUGGESTION_CATEGORIES);

exports.create = (req, res) =>
  handle(
    res,
    () => clinicalSuggestionService.createSuggestion(req.body, req.user.user_id),
    201
  );

exports.update = (req, res) =>
  handle(res, () =>
    clinicalSuggestionService.updateSuggestion(req.params.suggestionId, req.body)
  );

exports.remove = (req, res) =>
  handle(res, () =>
    clinicalSuggestionService.removeSuggestion(req.params.suggestionId)
  );

exports.recordUsage = (req, res) =>
  handle(res, () =>
    clinicalSuggestionService.recordUsage(req.params.suggestionId, req.user.user_id)
  );

exports.learn = (req, res) =>
  handle(res, () =>
    clinicalSuggestionService.learnFromText({
      text: req.body.text,
      category: req.body.category,
      userId: req.user.user_id,
      departmentId: req.body.department_id,
    })
  );

exports.learnForm = (req, res) =>
  handle(res, () =>
    clinicalSuggestionService.learnFromFormData({
      formData: req.body.form_data,
      fieldsMeta: req.body.fields_meta,
      userId: req.user.user_id,
      defaultCategory: req.body.default_category,
    })
  );

exports.importDefaults = (req, res) =>
  handle(res, () =>
    clinicalSuggestionService.importDefaults(req.user.user_id)
  );
