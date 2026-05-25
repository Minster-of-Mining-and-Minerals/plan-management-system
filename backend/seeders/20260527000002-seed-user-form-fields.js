"use strict";

const { ensureCoreFormFields } = require("../services/coreFormFieldService");

/** Seeds required core User form fields (full_name, email, phone_number). */
module.exports = {
  async up() {
    await ensureCoreFormFields();
  },

  async down() {
    const { FormField } = require("../models");
    const { CORE_FIELD_KEY_SET } = require("../config/coreUserFormFields");

    await FormField.destroy({
      where: {
        model_name: "User",
        field_key: [...CORE_FIELD_KEY_SET],
      },
    });
  },
};
