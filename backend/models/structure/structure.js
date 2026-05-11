"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Structure extends Model {
        static associate(models) {
            // Self-referencing hierarchy (parent → children)
            Structure.belongsTo(models.Structure, {
                foreignKey: "parent_id",
                as: "parent",
            });

            Structure.hasMany(models.Structure, {
                foreignKey: "parent_id",
                as: "children",
            });

            // One structure has many users
            Structure.hasMany(models.User, {
                foreignKey: "structure_id",
                as: "users",
            });

            // One structure has many permission groups
            Structure.belongsToMany(models.PermissionGroup, {
                through: models.StructurePermissionGroup,
                foreignKey: "structure_id",
                otherKey: "permission_group_id",
                as: "permissionGroups",
            });
        }
    }

    Structure.init(
        {
            structure_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
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
            modelName: "Structure",
            tableName: "structures",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            deletedAt: "deleted_at",
            paranoid: true,

            indexes: [
                {
                    fields: ["parent_id", "name"],
                },
            ],
        }
    );

    return Structure;
};