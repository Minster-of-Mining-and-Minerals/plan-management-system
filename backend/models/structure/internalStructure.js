"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class InternalStructure extends Model {
        static associate(models) {
            // 🔗 Belongs to GovernmentStructure
            InternalStructure.belongsTo(models.GovernmentStructure, {
                foreignKey: "government_structure_id",
                as: "governmentStructure",
            });

            // 🔁 Self hierarchy (optional: team → sub-team)
            InternalStructure.belongsTo(models.InternalStructure, {
                foreignKey: "parent_id",
                as: "parent",
            });

            InternalStructure.hasMany(models.InternalStructure, {
                foreignKey: "parent_id",
                as: "children",
            });

            // 👥 Users inside internal structure
            InternalStructure.hasMany(models.User, {
                foreignKey: "internal_structure_id",
                as: "users",
            });

            InternalStructure.belongsToMany(models.PermissionGroup, {
                through: models.InternalStructurePermissionGroup,
                foreignKey: "internal_structure_id",
                otherKey: "permission_group_id",
                as: "permissionGroups",
            });
        }
    }

    InternalStructure.init(
        {
            internal_structure_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },

            government_structure_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            parent_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },

            level: {
                type: DataTypes.INTEGER,
                defaultValue: 1,
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
        },
        {
            sequelize,
            modelName: "InternalStructure",
            tableName: "internal_structures",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            deletedAt: "deleted_at",
            paranoid: true,

            indexes: [
                {
                    fields: ["government_structure_id"],
                },
                {
                    unique: true,
                    fields: ["parent_id", "name"],
                },
            ],
        }
    );

    return InternalStructure;
};