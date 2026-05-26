"use strict";

const { v4: uuidv4 } = require("uuid");

const ACCOUNT_GROUP_TITLE = "Account";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("form_fields", "group_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "form_field_groups",
        key: "group_id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    await queryInterface.addIndex("form_fields", ["group_id"]);

    const now = new Date();
    const [fields] = await queryInterface.sequelize.query(
      `SELECT field_id, model_name, category FROM form_fields`
    );

    const categoriesByModel = new Map();
    for (const row of fields) {
      const cat = row.category || "General";
      if (!categoriesByModel.has(row.model_name)) {
        categoriesByModel.set(row.model_name, new Set());
      }
      categoriesByModel.get(row.model_name).add(cat);
    }

    const groupIdByModelTitle = new Map();

    for (const [modelName, categories] of categoriesByModel) {
      let sortOrder = 0;
      const sorted = [...categories].sort((a, b) => {
        if (a === ACCOUNT_GROUP_TITLE) return -1;
        if (b === ACCOUNT_GROUP_TITLE) return 1;
        return a.localeCompare(b);
      });

      for (const title of sorted) {
        const groupId = uuidv4();
        const isAccount = title === ACCOUNT_GROUP_TITLE;
        await queryInterface.bulkInsert("form_field_groups", [
          {
            group_id: groupId,
            model_name: modelName,
            title,
            description: null,
            sort_order: sortOrder++,
            is_visible: true,
            is_required: isAccount,
            created_at: now,
            updated_at: now,
          },
        ]);
        groupIdByModelTitle.set(`${modelName}::${title}`, groupId);
      }
    }

    for (const row of fields) {
      const title = row.category || "General";
      const key = `${row.model_name}::${title}`;
      const groupId = groupIdByModelTitle.get(key);
      if (groupId) {
        await queryInterface.sequelize.query(
          `UPDATE form_fields SET group_id = :groupId WHERE field_id = :fieldId`,
          {
            replacements: { groupId, fieldId: row.field_id },
          }
        );
      }
    }

    const [orphans] = await queryInterface.sequelize.query(
      `SELECT field_id, model_name FROM form_fields WHERE group_id IS NULL`
    );

    for (const row of orphans) {
      const groupId = uuidv4();
      await queryInterface.bulkInsert("form_field_groups", [
        {
          group_id: groupId,
          model_name: row.model_name,
          title: "General",
          description: null,
          sort_order: 999,
          is_visible: true,
          is_required: false,
          created_at: now,
          updated_at: now,
        },
      ]);
      await queryInterface.sequelize.query(
        `UPDATE form_fields SET group_id = :groupId WHERE field_id = :fieldId`,
        {
          replacements: { groupId, fieldId: row.field_id },
        }
      );
    }

    await queryInterface.changeColumn("form_fields", "group_id", {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "form_field_groups",
        key: "group_id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("form_fields", "group_id");
    await queryInterface.dropTable("form_field_groups");
  },
};
