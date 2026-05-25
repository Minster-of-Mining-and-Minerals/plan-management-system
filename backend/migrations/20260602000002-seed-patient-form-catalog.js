"use strict";

const { ensurePatientFormCatalog } = require("../services/patientFormSeedService");

module.exports = {
  async up() {
    await ensurePatientFormCatalog();
  },

  async down() {
    const { FormField, FormFieldGroup } = require("../models");
    const { PATIENT_MODEL_NAME } = require("../config/accountTypes");
    const { CORE_FIELD_KEY_SET } = require("../config/corePatientFormFields");
    const { PATIENT_FORM_CATEGORIES } = require("../config/patientFormCatalog");

    const customKeys = PATIENT_FORM_CATEGORIES.flatMap((c) =>
      (c.fields || []).map((f) => f.field_key)
    );

    if (customKeys.length) {
      await FormField.destroy({
        where: {
          model_name: PATIENT_MODEL_NAME,
          field_key: customKeys,
          storage_type: "custom",
        },
      });
    }

    const titles = PATIENT_FORM_CATEGORIES.filter((c) => c.title !== "Account").map(
      (c) => c.title
    );
    if (titles.length) {
      await FormFieldGroup.destroy({
        where: { model_name: PATIENT_MODEL_NAME, title: titles },
      });
    }
  },
};
