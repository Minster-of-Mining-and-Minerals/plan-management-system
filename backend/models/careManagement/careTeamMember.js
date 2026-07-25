"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CareTeamMember extends Model {
    static associate(models) {
      CareTeamMember.belongsTo(models.ClinicalCarePlan, { foreignKey: "plan_id", as: "plan" });
      CareTeamMember.belongsTo(models.User, { foreignKey: "clinician_id", as: "clinician" });
      CareTeamMember.belongsTo(models.User, { foreignKey: "patient_id", as: "patient" });
      CareTeamMember.belongsTo(models.User, { foreignKey: "added_by", as: "addedBy" });
    }
  }

  CareTeamMember.init({
    team_member_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    plan_id: { type: DataTypes.UUID, allowNull: false },
    patient_id: { type: DataTypes.UUID, allowNull: false },
    clinician_id: { type: DataTypes.UUID, allowNull: false },
    role: { type: DataTypes.STRING(50), allowNull: false, defaultValue: "OTHER" },
    responsibilities: { type: DataTypes.TEXT, allowNull: true },
    added_by: { type: DataTypes.UUID, allowNull: false },
  }, {
    sequelize, modelName: "CareTeamMember", tableName: "care_team_members",
    timestamps: true, createdAt: "created_at", updatedAt: "updated_at", underscored: true,
  });

  return CareTeamMember;
};
