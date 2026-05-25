"use strict";

const { validateAndPickUserFields } = require("../services/dynamicUserValidationService");

const dynamicValidateCreateUser = async (req, res, next) => {
  try {
    const { userData, customValues, role_ids, fields } =
      await validateAndPickUserFields(req.body, { isUpdate: false });

    req.validatedUserData = userData;
    req.validatedCustomValues = customValues;
    req.validatedRoleIds = role_ids;
    req.validatedFormFields = fields;
    next();
  } catch (err) {
    return res.status(err.status || 400).json({
      success: false,
      message: err.message,
      errors: err.details,
    });
  }
};

const dynamicValidateUpdateUser = async (req, res, next) => {
  try {
    const { userData, customValues, role_ids, fields } =
      await validateAndPickUserFields(req.body, { isUpdate: true });

    req.validatedUserData = userData;
    req.validatedCustomValues = customValues;
    req.validatedRoleIds = role_ids;
    req.validatedFormFields = fields;
    next();
  } catch (err) {
    return res.status(err.status || 400).json({
      success: false,
      message: err.message,
      errors: err.details,
    });
  }
};

module.exports = {
  dynamicValidateCreateUser,
  dynamicValidateUpdateUser,
};
