"use strict";

const { tableExists } = require("./_helpers/migrationUtils");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const categoriesExist = await tableExists(
      queryInterface,
      "medical_diagram_categories"
    );

    if (!categoriesExist) {
      await queryInterface.createTable("medical_diagram_categories", {
        category_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal("gen_random_uuid()"),
          primaryKey: true,
        },
        name: { type: Sequelize.STRING(150), allowNull: false, unique: true },
        code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        sort_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "active",
        },
        created_by: { type: Sequelize.UUID, allowNull: true },
        updated_by: { type: Sequelize.UUID, allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      });
    }

    const diagramTable = await queryInterface.describeTable("medical_diagrams");
    if (!diagramTable.category_id) {
      await queryInterface.addColumn("medical_diagrams", "category_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "medical_diagram_categories",
          key: "category_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
      await queryInterface.addIndex("medical_diagrams", ["category_id"]);
    }

    if (diagramTable.category) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT DISTINCT category FROM medical_diagrams WHERE category IS NOT NULL AND TRIM(category) <> ''`
      );
      for (const row of rows) {
        const name = String(row.category).trim();
        const code = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "")
          .slice(0, 64) || "category";
        const [existing] = await queryInterface.sequelize.query(
          `SELECT category_id FROM medical_diagram_categories WHERE name = :name OR code = :code LIMIT 1`,
          { replacements: { name, code } }
        );
        let categoryId = existing[0]?.category_id;
        if (!categoryId) {
          const [inserted] = await queryInterface.sequelize.query(
            `INSERT INTO medical_diagram_categories (category_id, name, code, sort_order, status, created_at, updated_at)
             VALUES (gen_random_uuid(), :name, :code, 0, 'active', NOW(), NOW())
             RETURNING category_id`,
            { replacements: { name, code } }
          );
          categoryId = inserted[0]?.category_id;
        }
        if (categoryId) {
          await queryInterface.sequelize.query(
            `UPDATE medical_diagrams SET category_id = :categoryId WHERE category = :name`,
            { replacements: { categoryId, name } }
          );
        }
      }
      await queryInterface.removeColumn("medical_diagrams", "category");
      await queryInterface.removeIndex("medical_diagrams", ["category"]).catch(() => {});
    }
  },

  async down(queryInterface, Sequelize) {
    const diagramTable = await queryInterface.describeTable("medical_diagrams");
    if (!diagramTable.category) {
      await queryInterface.addColumn("medical_diagrams", "category", {
        type: Sequelize.STRING(64),
        allowNull: true,
      });
      const [diagrams] = await queryInterface.sequelize.query(
        `SELECT d.diagram_id, c.name AS category_name
         FROM medical_diagrams d
         LEFT JOIN medical_diagram_categories c ON c.category_id = d.category_id`
      );
      for (const row of diagrams) {
        if (row.category_name) {
          await queryInterface.sequelize.query(
            `UPDATE medical_diagrams SET category = :name WHERE diagram_id = :id`,
            { replacements: { name: row.category_name, id: row.diagram_id } }
          );
        }
      }
    }
    if (diagramTable.category_id) {
      await queryInterface.removeColumn("medical_diagrams", "category_id");
    }
    await queryInterface.dropTable("medical_diagram_categories");
  },
};
