"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyProductionTargetAmendment extends Model {
    static associate(models) {
      CompanyProductionTargetAmendment.belongsTo(models.CompanyProductionAssignment, {
        foreignKey: "assignment_id",
        as: "assignment",
      });

      CompanyProductionTargetAmendment.belongsTo(models.User, {
        foreignKey: "submitted_by",
        as: "submitter",
      });

      CompanyProductionTargetAmendment.belongsTo(models.User, {
        foreignKey: "reviewed_by",
        as: "reviewer",
      });

      CompanyProductionTargetAmendment.hasMany(models.CompanyProductionTarget, {
        foreignKey: "amendment_id",
        as: "proposedTargets",
      });

      CompanyProductionTargetAmendment.hasMany(models.CompanyProductionTargetApprovalHistory, {
        foreignKey: "amendment_id",
        as: "histories",
      });
    }
  }

  CompanyProductionTargetAmendment.init(
    {
      amendment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      assignment_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      amendment_reference: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      current_approved_version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      proposed_version_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2,
      },
      current_annual_target: {
        type: DataTypes.DECIMAL(16, 4),
        allowNull: false,
        defaultValue: 0,
      },
      proposed_annual_target: {
        type: DataTypes.DECIMAL(16, 4),
        allowNull: false,
      },
      amendment_reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      submission_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      review_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      effective_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "amendment_submitted",
      },
      submitted_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reviewed_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      activated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CompanyProductionTargetAmendment",
      tableName: "company_production_target_amendments",
      timestamps: true,
      underscored: true,
    }
  );

  return CompanyProductionTargetAmendment;
};
