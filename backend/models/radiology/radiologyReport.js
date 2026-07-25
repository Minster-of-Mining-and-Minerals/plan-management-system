"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class RadiologyReport extends Model {
    static associate(models) {
      RadiologyReport.belongsTo(models.RadiologyStudy, {
        foreignKey: "study_id",
        as: "study",
      });
      RadiologyReport.belongsTo(models.ClinicalOrder, {
        foreignKey: "order_id",
        as: "order",
      });
      RadiologyReport.belongsTo(models.ClinicalOrderResult, {
        foreignKey: "result_id",
        as: "clinicalOrderResult",
      });
      RadiologyReport.belongsTo(models.User, {
        foreignKey: "reported_by",
        as: "reportedByUser",
      });
      RadiologyReport.belongsTo(models.User, {
        foreignKey: "verified_by",
        as: "verifiedByUser",
      });
      RadiologyReport.belongsTo(models.RadiologyReportTemplate, {
        foreignKey: "template_id",
        as: "template",
      });
      RadiologyReport.hasMany(models.RadiologyReportHistory, {
        foreignKey: "report_id",
        as: "amendments",
      });
    }
  }

  RadiologyReport.init(
    {
      report_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      study_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      result_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      template_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      structured_sections: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      findings: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      impression: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      recommendations: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      verification_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "PRELIMINARY",
      },
      patient_release_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "NOT_RELEASED",
      },
      reported_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      verified_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      signed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "RadiologyReport",
      tableName: "radiology_reports",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RadiologyReport;
};
