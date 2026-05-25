"use strict";

const { ensurePatientFormCatalog } = require("../services/patientFormSeedService");

/** Seeds patient form catalog (core fields + default categories). */
module.exports = {
  async up() {
    await ensurePatientFormCatalog();
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
