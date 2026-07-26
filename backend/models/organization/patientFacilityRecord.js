"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PatientFacilityRecord extends Model {
    static associate(models) {
      if (models.User) {
        PatientFacilityRecord.belongsTo(models.User, {
          foreignKey: "patient_id",
          as: "patient",
          constraints: false,
        });
      }
      if (models.Facility) {
        PatientFacilityRecord.belongsTo(models.Facility, {
          foreignKey: "facility_id",
          as: "facility",
          constraints: false,
        });
      }
      if (models.OrganizationTenant) {
        PatientFacilityRecord.belongsTo(models.OrganizationTenant, {
          foreignKey: "tenant_id",
          as: "tenant",
          constraints: false,
        });
      }
    }
  }

  PatientFacilityRecord.init(
    {
      record_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      tenant_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "DEFAULT_HOSPITAL",
      },
      facility_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      facility_mrn: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      registration_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "PatientFacilityRecord",
      tableName: "patient_facility_records",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PatientFacilityRecord;
};
