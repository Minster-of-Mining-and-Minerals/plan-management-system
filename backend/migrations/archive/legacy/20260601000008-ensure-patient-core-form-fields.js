"use strict";

const { ensureCoreFormFields } = require("../services/coreFormFieldService");

/** Idempotently seed Patient model core form fields (full_name, email, phone_number). */
module.exports = {
  async up() {
    await ensureCoreFormFields();
  },

  async down() {
    const { FormField } = require("../models");
    const { CORE_FIELD_KEY_SET } = require("../config/corePatientFormFields");
    const { PATIENT_MODEL_NAME } = require("../config/accountTypes");

    await FormField.destroy({
      where: {
        model_name: PATIENT_MODEL_NAME,
        field_key: [...CORE_FIELD_KEY_SET],
        storage_type: "core",
      },
    });
  },
};
