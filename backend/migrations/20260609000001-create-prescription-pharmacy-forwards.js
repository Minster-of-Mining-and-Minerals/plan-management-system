"use strict";

const { timestampColumns, safeAddIndex, dropTableIfExists } = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await queryInterface.createTable("prescription_pharmacy_forwards", {
      forward_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      prescription_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "prescriptions", key: "prescription_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      schedule_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "patient_schedules", key: "schedule_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      pharmacy_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "pharmacies", key: "pharmacy_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      pharmacy_prescription_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "pharmacy_prescriptions",
          key: "pharmacy_prescription_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      sent_by: { type: Sequelize.UUID, allowNull: false },
      sent_at: { type: Sequelize.DATE, allowNull: false },
      forward_status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "sent",
      },
      ...ts,
    });

    await safeAddIndex(queryInterface, "prescription_pharmacy_forwards", [
      "schedule_id",
    ]);
    await safeAddIndex(queryInterface, "prescription_pharmacy_forwards", [
      "prescription_id",
    ]);
    await safeAddIndex(queryInterface, "prescription_pharmacy_forwards", [
      "pharmacy_id",
    ]);
    await safeAddIndex(
      queryInterface,
      "prescription_pharmacy_forwards",
      ["schedule_id", "prescription_id", "pharmacy_id"],
      { unique: true, name: "prescription_pharmacy_forwards_unique" }
    );
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "prescription_pharmacy_forwards");
  },
};
