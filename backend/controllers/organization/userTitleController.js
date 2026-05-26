"use strict";

const userTitleService = require("../../services/userTitleService");

const handleError = (res, error) => {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Internal server error",
    ...(status === 500 && error.message ? { error: error.message } : {}),
  });
};

const createUserTitle = async (req, res) => {
  try {
    const record = await userTitleService.createUserTitle(
      req.body,
      req.user?.user_id
    );
    return res.status(201).json({
      success: true,
      message: "User title created successfully",
      data: userTitleService.formatUserTitle(record),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getUserTitles = async (req, res) => {
  try {
    const result = await userTitleService.listUserTitles(req.query);
    return res.status(200).json({
      success: true,
      message: "User titles fetched successfully",
      count: result.count,
      ...(result.paginated
        ? {
            totalPages: result.totalPages,
            currentPage: result.currentPage,
            limit: result.limit,
          }
        : {}),
      data: result.data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getUserTitleById = async (req, res) => {
  try {
    const record = await userTitleService.getUserTitleById(req.params.id);
    return res.status(200).json({
      success: true,
      message: "User title fetched successfully",
      data: userTitleService.formatUserTitle(record),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateUserTitle = async (req, res) => {
  try {
    const record = await userTitleService.updateUserTitle(
      req.params.id,
      req.body,
      req.user?.user_id
    );
    return res.status(200).json({
      success: true,
      message: "User title updated successfully",
      data: userTitleService.formatUserTitle(record),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const toggleUserTitleStatus = async (req, res) => {
  try {
    const record = await userTitleService.toggleUserTitleStatus(
      req.params.id,
      req.body.status,
      req.user?.user_id
    );
    return res.status(200).json({
      success: true,
      message: "User title status updated successfully",
      data: userTitleService.formatUserTitle(record),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteUserTitle = async (req, res) => {
  try {
    await userTitleService.deleteUserTitle(req.params.id, req.user?.user_id);
    return res.status(200).json({
      success: true,
      message: "User title deleted successfully",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createUserTitle,
  getUserTitles,
  getUserTitleById,
  updateUserTitle,
  toggleUserTitleStatus,
  deleteUserTitle,
};
