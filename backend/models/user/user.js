// models/user.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {

      User.belongsToMany(models.Role, {
        through: models.UserRoles,
        foreignKey: "user_id",
        otherKey: "role_id",
        as: "roles",
      });

      User.belongsToMany(models.PermissionGroup, {
        through: models.UserPermissionGroup,
        foreignKey: "user_id",
        otherKey: "permission_group_id",
        as: "permissionGroups",
      });

      User.hasOne(models.InternalUserProfile, {
        foreignKey: "user_id",
        as: "internalProfile",
      });

      User.hasOne(models.PatientProfile, {
        foreignKey: "user_id",
        as: "patientProfile",
      });

      User.hasMany(models.PatientFieldValue, {
        foreignKey: "user_id",
        as: "patientFieldValues",
      });

      User.hasMany(models.PatientSchedule, {
        foreignKey: "patient_id",
        as: "patientSchedules",
      });

      User.hasMany(models.PatientSchedule, {
        foreignKey: "assigned_staff_id",
        as: "staffSchedules",
      });

      User.hasMany(models.StaffAppointment, {
        foreignKey: "assigned_staff_id",
        as: "staffAppointments",
      });

      User.hasMany(models.Notification, {
        foreignKey: "recipient_id",
        as: "notifications",
      });

      User.hasOne(models.PharmacyUserProfile, {
        foreignKey: "user_id",
        as: "pharmacyProfile",
      });

      if (models.UserFacilityAssignment) {
        User.hasMany(models.UserFacilityAssignment, {
          foreignKey: "user_id",
          as: "facilityAssignments",
          constraints: false,
        });
      }

      if (models.PatientFacilityRecord) {
        User.hasMany(models.PatientFacilityRecord, {
          foreignKey: "patient_id",
          as: "patientFacilityRecords",
          constraints: false,
        });
      }
    }
  }

  User.init(
    {
      user_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      full_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      phone_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
      },
      profile_image: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      is_first_logged_in: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      password_changed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      account_type: {
        type: DataTypes.ENUM("INTERNAL", "PATIENT", "PHARMACY"),
        allowNull: false,
        defaultValue: "INTERNAL",
      },
      otp: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      otp_expiry: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      token_version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      underscored: true,
    }
  );

  return User;
};
