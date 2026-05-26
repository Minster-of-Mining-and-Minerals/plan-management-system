"use strict";

const { v4: uuidv4 } = require("uuid");

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some(
    (t) => t === tableName || t === `public.${tableName}` || t.endsWith(`.${tableName}`)
  );
}

async function safeAddIndex(queryInterface, table, fields, options = {}) {
  try {
    await queryInterface.addIndex(table, fields, options);
  } catch (err) {
    const msg = err?.message || "";
    if (!msg.includes("already exists")) throw err;
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, "audit_logs"))) {
      await queryInterface.createTable("audit_logs", {
        audit_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        actor_user_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "users", key: "user_id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        action: { type: Sequelize.STRING(64), allowNull: false },
        resource_type: { type: Sequelize.STRING(64), allowNull: false },
        resource_id: { type: Sequelize.UUID, allowNull: true },
        details: { type: Sequelize.JSONB, allowNull: true },
        ip_address: { type: Sequelize.STRING(64), allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      });
    }

    await safeAddIndex(queryInterface, "audit_logs", ["actor_user_id"]);
    await safeAddIndex(queryInterface, "audit_logs", [
      "resource_type",
      "resource_id",
    ]);
    await safeAddIndex(queryInterface, "audit_logs", ["created_at"]);

    const now = new Date();
    const perms = [
      { resource: "patients", action: "create" },
      { resource: "patients", action: "read" },
      { resource: "patients", action: "update" },
      { resource: "patients", action: "delete" },
      { resource: "patients", action: "export" },
    ];

    for (const p of perms) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = :resource AND action = :action LIMIT 1`,
        { replacements: p }
      );
      if (!existing.length) {
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: uuidv4(),
            resource: p.resource,
            action: p.action,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("permissions", {
      resource: "patients",
    });
    await queryInterface.dropTable("audit_logs");
  },
};
