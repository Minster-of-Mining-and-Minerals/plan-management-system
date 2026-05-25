"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("form_fields", "storage_type", {
      type: Sequelize.ENUM("core", "custom"),
      allowNull: false,
      defaultValue: "custom",
    });

    await queryInterface.addColumn("form_fields", "category", {
      type: Sequelize.STRING(64),
      allowNull: false,
      defaultValue: "General",
    });

    await queryInterface.addIndex("form_fields", ["model_name", "category"], {
      name: "form_fields_model_name_category",
    });

    await queryInterface.sequelize.query(`
      UPDATE form_fields
      SET storage_type = 'core'
      WHERE model_name = 'User'
        AND field_key IN ('full_name', 'email', 'phone_number', 'profile_image', 'is_active')
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "form_fields",
      "form_fields_model_name_category"
    );
    await queryInterface.removeColumn("form_fields", "category");
    await queryInterface.removeColumn("form_fields", "storage_type");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_form_fields_storage_type";'
    );
  },
};
