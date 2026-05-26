"use strict";

const departmentService = require("../../services/departmentService");

const handleError = (res, error) => {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Internal server error",
    ...(status === 500 && error.message ? { error: error.message } : {}),
  });
};

const createDepartment = async (req, res) => {
  try {
    const record = await departmentService.createDepartment(
      req.body,
      req.user?.user_id
    );
    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: departmentService.formatDepartment(record),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getDepartments = async (req, res) => {
  try {
    const result = await departmentService.listDepartments(req.query);
    return res.status(200).json({
      success: true,
      message: "Departments fetched successfully",
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

const getDepartmentById = async (req, res) => {
  try {
    const record = await departmentService.getDepartmentById(req.params.id);
    return res.status(200).json({
      success: true,
      message: "Department fetched successfully",
      data: departmentService.formatDepartment(record),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateDepartment = async (req, res) => {
  try {
    const record = await departmentService.updateDepartment(
      req.params.id,
      req.body,
      req.user?.user_id
    );
    return res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: departmentService.formatDepartment(record),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const toggleDepartmentStatus = async (req, res) => {
  try {
    const record = await departmentService.toggleDepartmentStatus(
      req.params.id,
      req.body.status,
      req.user?.user_id
    );
    return res.status(200).json({
      success: true,
      message: "Department status updated successfully",
      data: departmentService.formatDepartment(record),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteDepartment = async (req, res) => {
  try {
    await departmentService.deleteDepartment(req.params.id, req.user?.user_id);
    return res.status(200).json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  toggleDepartmentStatus,
  deleteDepartment,
};
