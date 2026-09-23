"use strict";

const containerService = require("../../services/formConfigContainerService");
const fieldService = require("../../services/formConfigFieldService");

function handleServiceError(res, error) {
  const status = error.statusCode || 500;
  return res.status(status).json({ success: false, message: error.message, details: error.details });
}

const listContainers = async (req, res) => {
  try {
    const query = req.validatedQuery || req.query;
    const isActive =
      query.is_active !== undefined ? query.is_active === true || query.is_active === "true" : undefined;
    const isPublished =
      query.is_published !== undefined
        ? query.is_published === true || query.is_published === "true"
        : undefined;

    const containers = await containerService.listContainers({
      isActive,
      isPublished,
      search: query.search,
      issueCategoryId: query.issue_category_id,
    });
    return res.json({ success: true, data: containers });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const listPublishedContainers = async (req, res) => {
  try {
    const containers = await containerService.listPublishedContainers();
    return res.json({ success: true, data: containers });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const getContainerById = async (req, res) => {
  try {
    const container = await containerService.getContainerById(req.params.id);
    if (!container) {
      return res.status(404).json({ success: false, message: "Form configuration container not found" });
    }
    return res.json({ success: true, data: container });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const getPublishedFormByCategory = async (req, res) => {
  try {
    const containers = await containerService.listPublishedContainersForCategory(
      req.params.categoryId
    );
    return res.json({ success: true, data: containers });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const getPublishedFormByContainer = async (req, res) => {
  try {
    const form = await containerService.getPublishedFormByContainerId(req.params.id);
    if (!form) {
      return res.status(404).json({ success: false, message: "Published form not found" });
    }
    return res.json({ success: true, data: form });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const createContainer = async (req, res) => {
  try {
    const container = await containerService.createContainer(req.body, req.user.user_id);
    return res.status(201).json({ success: true, message: "Form container created", data: container });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const updateContainer = async (req, res) => {
  try {
    const container = await containerService.updateContainer(
      req.params.id,
      req.body,
      req.user.user_id
    );
    return res.json({ success: true, message: "Form container updated", data: container });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const deleteContainer = async (req, res) => {
  try {
    await containerService.deleteContainer(req.params.id);
    return res.json({ success: true, message: "Form container deleted" });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const publishContainer = async (req, res) => {
  try {
    const container = await containerService.setContainerPublished(
      req.params.id,
      true,
      req.user.user_id
    );
    return res.json({ success: true, message: "Form container published", data: container });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const unpublishContainer = async (req, res) => {
  try {
    const container = await containerService.setContainerPublished(
      req.params.id,
      false,
      req.user.user_id
    );
    return res.json({ success: true, message: "Form container unpublished", data: container });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const activateContainer = async (req, res) => {
  try {
    const container = await containerService.setContainerActive(
      req.params.id,
      true,
      req.user.user_id
    );
    return res.json({ success: true, message: "Form container activated", data: container });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const deactivateContainer = async (req, res) => {
  try {
    const container = await containerService.setContainerActive(
      req.params.id,
      false,
      req.user.user_id
    );
    return res.json({ success: true, message: "Form container deactivated", data: container });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const listFields = async (req, res) => {
  try {
    const isActive =
      req.query.is_active !== undefined
        ? req.query.is_active === true || req.query.is_active === "true"
        : undefined;
    const fields = await fieldService.listFields(req.params.containerId, { isActive });
    return res.json({ success: true, data: fields });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const createField = async (req, res) => {
  try {
    const field = await fieldService.createField(req.params.containerId, req.body);
    return res.status(201).json({ success: true, message: "Form field created", data: field });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const updateField = async (req, res) => {
  try {
    const field = await fieldService.updateField(req.params.fieldId, req.body);
    return res.json({ success: true, message: "Form field updated", data: field });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const deleteField = async (req, res) => {
  try {
    await fieldService.deleteField(req.params.fieldId);
    return res.json({ success: true, message: "Form field deleted" });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const activateField = async (req, res) => {
  try {
    const field = await fieldService.setFieldActive(req.params.fieldId, true);
    return res.json({ success: true, message: "Form field activated", data: field });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const deactivateField = async (req, res) => {
  try {
    const field = await fieldService.setFieldActive(req.params.fieldId, false);
    return res.json({ success: true, message: "Form field deactivated", data: field });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const reorderFields = async (req, res) => {
  try {
    const fields = await fieldService.reorderFields(
      req.params.containerId,
      req.body.ordered_field_ids
    );
    return res.json({ success: true, message: "Fields reordered", data: fields });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

module.exports = {
  listContainers,
  listPublishedContainers,
  getContainerById,
  getPublishedFormByCategory,
  getPublishedFormByContainer,
  createContainer,
  updateContainer,
  deleteContainer,
  publishContainer,
  unpublishContainer,
  activateContainer,
  deactivateContainer,
  listFields,
  createField,
  updateField,
  deleteField,
  activateField,
  deactivateField,
  reorderFields,
};
