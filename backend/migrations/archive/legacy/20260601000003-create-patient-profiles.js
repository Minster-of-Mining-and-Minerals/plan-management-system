"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("patient_profiles", {
      patient_profile_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      patient_code: {
        type: Sequelize.STRING(32),
        allowNull: false,
        unique: true,
      },
      qr_code: { type: Sequelize.TEXT, allowNull: true },
      barcode: { type: Sequelize.STRING(128), allowNull: true },
      date_of_birth: { type: Sequelize.DATEONLY, allowNull: true },
      gender: { type: Sequelize.STRING(32), allowNull: true },
      blood_group: { type: Sequelize.STRING(16), allowNull: true },
      marital_status: { type: Sequelize.STRING(32), allowNull: true },
      nationality: { type: Sequelize.STRING(64), allowNull: true },
      preferred_language: { type: Sequelize.STRING(32), allowNull: true },
      emergency_contacts: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      insurance_profile: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      medical_history_summary: { type: Sequelize.TEXT, allowNull: true },
      patient_status: {
        type: Sequelize.ENUM("active", "inactive", "deceased", "archived"),
        allowNull: false,
        defaultValue: "active",
      },
      registered_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "SET NULL",
        onDelete: "SET NULL",
      },
      registered_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("patient_profiles", ["user_id"]);
    await queryInterface.addIndex("patient_profiles", ["patient_code"]);
    await queryInterface.addIndex("patient_profiles", ["patient_status"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("patient_profiles");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_patient_profiles_patient_status";'
    );
  },
};
