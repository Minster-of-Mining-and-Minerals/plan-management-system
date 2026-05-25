"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("form_fields", {
      field_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      model_name: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      field_key: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      label: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      field_type: {
        type: Sequelize.ENUM(
          "input",
          "textarea",
          "select",
          "file",
          "checkbox",
          "date",
          "number"
        ),
        allowNull: false,
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_visible: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      config: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("form_fields", ["model_name"]);
    await queryInterface.addIndex("form_fields", ["model_name", "field_key"], {
      unique: true,
      name: "form_fields_model_name_field_key_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("form_fields");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_form_fields_field_type";'
    );
  },
};
