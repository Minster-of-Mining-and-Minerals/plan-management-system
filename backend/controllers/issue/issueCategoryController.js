"use strict";

const issueCategoryService = require("../../services/issueCategoryService");

function handleServiceError(res, error) {
  const status = error.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: error.message,
  });
}

const getIssueCategories = async (req, res) => {
  try {
    const query = req.validatedQuery || req.query;
    const isActive =
      query.is_active !== undefined ? query.is_active === true || query.is_active === "true" : undefined;
    const forRaising =
      query.for_raising !== undefined
        ? query.for_raising === true || query.for_raising === "true"
        : undefined;

    const categories = await issueCategoryService.listCategories({
      isActive,
      forRaising,
    });
    return res.json({ success: true, data: categories });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const getIssueCategoryById = async (req, res) => {
  try {
    const category = await issueCategoryService.getCategoryById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Issue category not found" });
    }
    return res.json({ success: true, data: category });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const createIssueCategory = async (req, res) => {
  try {
    const category = await issueCategoryService.createCategory(
      req.body,
      req.user?.permissions || []
    );
    return res.status(201).json({
      success: true,
      message: "Issue category created",
      data: category,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const updateIssueCategory = async (req, res) => {
  try {
    const category = await issueCategoryService.updateCategory(
      req.params.id,
      req.body,
      req.user?.permissions || []
    );
    return res.json({
      success: true,
      message: "Issue category updated",
      data: category,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const deactivateIssueCategory = async (req, res) => {
  try {
    const category = await issueCategoryService.deactivateCategory(req.params.id);
    return res.json({
      success: true,
      message: "Issue category deactivated",
      data: category,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

module.exports = {
  getIssueCategories,
  getIssueCategoryById,
  createIssueCategory,
  updateIssueCategory,
  deactivateIssueCategory,
};
