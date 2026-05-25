// models/formField.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class FormField extends Model { }

    FormField.init(
        {
            field_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },

            model_name: {
                type: DataTypes.STRING, // e.g. "User"
                allowNull: false,
            },

            field_key: {
                type: DataTypes.STRING, // e.g. "full_name"
                allowNull: false,
            },

            label: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            field_type: {
                type: DataTypes.ENUM(
                    "input",
                    "textarea",
                    "select",
                    "file",
                    "checkbox",
                    "radio",
                    "date",
                    "number"
                ),
                allowNull: false,
            },

            is_required: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },

            is_visible: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },

            sort_order: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },

            options: {
                type: DataTypes.JSON,
                allowNull: true,
                // used for select/radio/checkbox options
                // example: ["Male", "Female"]
            },
        },
        {
            sequelize,
            modelName: "FormField",
            tableName: "form_fields",
            timestamps: true,
            underscored: true,
        }
    );

    return FormField;
};