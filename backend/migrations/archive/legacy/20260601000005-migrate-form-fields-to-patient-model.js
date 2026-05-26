"use strict";

const { PATIENT_MODEL_NAME } = require("../config/accountTypes");

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE form_fields SET model_name = :patient WHERE model_name = 'User'`,
      { replacements: { patient: PATIENT_MODEL_NAME } }
    );
    await queryInterface.sequelize.query(
      `UPDATE form_field_groups SET model_name = :patient WHERE model_name = 'User'`,
      { replacements: { patient: PATIENT_MODEL_NAME } }
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE form_fields SET model_name = 'User' WHERE model_name = :patient`,
      { replacements: { patient: PATIENT_MODEL_NAME } }
    );
    await queryInterface.sequelize.query(
      `UPDATE form_field_groups SET model_name = 'User' WHERE model_name = :patient`,
      { replacements: { patient: PATIENT_MODEL_NAME } }
    );
  },
};
