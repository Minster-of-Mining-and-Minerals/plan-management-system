"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const PURCHASING_CENTER_ADMIN_ROLE_ID = "40000000-0000-4000-8000-000000000001";
const PURCHASING_CENTER_OFFICER_ROLE_ID = "40000000-0000-4000-8000-000000000002";
const PURCHASING_CENTER_VIEWER_ROLE_ID = "40000000-0000-4000-8000-000000000003";

const NEW_PERMISSIONS = [
  { resource: "gold_prices", action: "read", permission_tier: "standard" },
  { resource: "gold_prices", action: "create", permission_tier: "standard" },
  { resource: "gold_prices", action: "update", permission_tier: "standard" },
  { resource: "gold_prices", action: "delete", permission_tier: "standard" },
  { resource: "gold_prices", action: "manage", permission_tier: "standard" },
];

async function ensurePermission(queryInterface, perm, now) {
  const existing = await queryInterface.sequelize.query(
    `SELECT permission_id FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action) LIMIT 1`,
    {
      replacements: { resource: perm.resource, action: perm.action },
      type: QueryTypes.SELECT,
    }
  );

  let permId;
  if (!existing || existing.length === 0) {
    permId = uuidv4();
    await queryInterface.bulkInsert("permissions", [
      {
        permission_id: permId,
        resource: perm.resource,
        action: perm.action,
        permission_tier: perm.permission_tier,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  } else {
    permId = existing[0].permission_id;
  }

  // Grant to Super Admin
  const existingRolePerm = await queryInterface.sequelize.query(
    `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
    {
      replacements: { roleId: SUPER_ADMIN_ROLE_ID, permId },
      type: QueryTypes.SELECT,
    }
  );

  if (!existingRolePerm || existingRolePerm.length === 0) {
    await queryInterface.bulkInsert("role_permissions", [
      {
        role_permission_id: uuidv4(),
        role_id: SUPER_ADMIN_ROLE_ID,
        permission_id: permId,
        created_at: now,
        updated_at: now,
      },
    ]);
  }

  return permId;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // 1. Create table gold_price_configurations
    await queryInterface.createTable("gold_price_configurations", {
      price_config_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      gold_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "all",
      },
      karat: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      purity_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      quality_grade: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      measurement_unit_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "gold_measurement_units",
          key: "unit_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      price_per_unit: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      min_price_per_unit: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: true,
      },
      max_price_per_unit: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: true,
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: "ETB",
      },
      effective_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      updated_by_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // 2. Add columns to gold_purchases table if not existing
    const goldPurchasesTable = await queryInterface.describeTable("gold_purchases");

    if (!goldPurchasesTable.gold_type) {
      await queryInterface.addColumn("gold_purchases", "gold_type", {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }

    if (!goldPurchasesTable.karat) {
      await queryInterface.addColumn("gold_purchases", "karat", {
        type: Sequelize.STRING(20),
        allowNull: true,
      });
    }

    if (!goldPurchasesTable.quality_grade) {
      await queryInterface.addColumn("gold_purchases", "quality_grade", {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }

    if (!goldPurchasesTable.purity_percentage) {
      await queryInterface.addColumn("gold_purchases", "purity_percentage", {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      });
    }

    if (!goldPurchasesTable.is_custom_price) {
      await queryInterface.addColumn("gold_purchases", "is_custom_price", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    if (!goldPurchasesTable.price_configuration_id) {
      await queryInterface.addColumn("gold_purchases", "price_configuration_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "gold_price_configurations",
          key: "price_config_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    // 3. Register permissions
    const pricePermIds = [];
    for (const p of NEW_PERMISSIONS) {
      const pid = await ensurePermission(queryInterface, p, now);
      pricePermIds.push(pid);
    }

    // Grant read permission to Purchasing Center roles
    for (const roleId of [
      PURCHASING_CENTER_ADMIN_ROLE_ID,
      PURCHASING_CENTER_OFFICER_ROLE_ID,
      PURCHASING_CENTER_VIEWER_ROLE_ID,
    ]) {
      const readPerm = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE LOWER(resource) = 'gold_prices' AND LOWER(action) = 'read' LIMIT 1`,
        { type: QueryTypes.SELECT }
      );
      if (readPerm && readPerm.length > 0) {
        const existingRp = await queryInterface.sequelize.query(
          `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
          { replacements: { roleId, permId: readPerm[0].permission_id }, type: QueryTypes.SELECT }
        );
        if (!existingRp || existingRp.length === 0) {
          await queryInterface.bulkInsert("role_permissions", [
            {
              role_permission_id: uuidv4(),
              role_id: roleId,
              permission_id: readPerm[0].permission_id,
              created_at: now,
              updated_at: now,
            },
          ]);
        }
      }
    }

    // 4. Seed default Gram-based price configurations
    const gramUnit = await queryInterface.sequelize.query(
      `SELECT unit_id FROM gold_measurement_units WHERE LOWER(code) = 'gram' LIMIT 1`,
      { type: QueryTypes.SELECT }
    );
    const gramUnitId = gramUnit && gramUnit.length > 0 ? gramUnit[0].unit_id : null;

    const sampleConfigs = [
      {
        price_config_id: uuidv4(),
        gold_type: "refined",
        karat: "24K",
        purity_percentage: 99.90,
        quality_grade: "Grade A (High Purity)",
        measurement_unit_id: gramUnitId,
        price_per_unit: 4850.00,
        min_price_per_unit: 4700.00,
        max_price_per_unit: 5050.00,
        currency: "ETB",
        effective_date: "2026-01-01",
        is_active: true,
        notes: "Official federal benchmark for 24 Karat fine gold bars and high-grade ingots.",
        created_at: now,
        updated_at: now,
      },
      {
        price_config_id: uuidv4(),
        gold_type: "smelted",
        karat: "22K",
        purity_percentage: 91.60,
        quality_grade: "Grade A (High Purity)",
        measurement_unit_id: gramUnitId,
        price_per_unit: 4450.00,
        min_price_per_unit: 4300.00,
        max_price_per_unit: 4650.00,
        currency: "ETB",
        effective_date: "2026-01-01",
        is_active: true,
        notes: "Standard benchmark for 22 Karat smelted bullion.",
        created_at: now,
        updated_at: now,
      },
      {
        price_config_id: uuidv4(),
        gold_type: "smelted",
        karat: "21K",
        purity_percentage: 87.50,
        quality_grade: "Grade B (Standard)",
        measurement_unit_id: gramUnitId,
        price_per_unit: 4250.00,
        min_price_per_unit: 4100.00,
        max_price_per_unit: 4450.00,
        currency: "ETB",
        effective_date: "2026-01-01",
        is_active: true,
        notes: "Commercial benchmark for 21 Karat gold.",
        created_at: now,
        updated_at: now,
      },
      {
        price_config_id: uuidv4(),
        gold_type: "raw_placer",
        karat: "raw",
        purity_percentage: 84.00,
        quality_grade: "Raw Artisanal (Placer / Dust)",
        measurement_unit_id: gramUnitId,
        price_per_unit: 4100.00,
        min_price_per_unit: 3950.00,
        max_price_per_unit: 4300.00,
        currency: "ETB",
        effective_date: "2026-01-01",
        is_active: true,
        notes: "Artisanal gold rate applicable to cooperative and small-scale miners panned gold.",
        created_at: now,
        updated_at: now,
      },
      {
        price_config_id: uuidv4(),
        gold_type: "commercial",
        karat: "18K",
        purity_percentage: 75.00,
        quality_grade: "Grade B (Standard)",
        measurement_unit_id: gramUnitId,
        price_per_unit: 3650.00,
        min_price_per_unit: 3500.00,
        max_price_per_unit: 3800.00,
        currency: "ETB",
        effective_date: "2026-01-01",
        is_active: true,
        notes: "18 Karat standard commercial rate.",
        created_at: now,
        updated_at: now,
      },
      {
        price_config_id: uuidv4(),
        gold_type: "commercial",
        karat: "14K",
        purity_percentage: 58.30,
        quality_grade: "Grade C (Commercial)",
        measurement_unit_id: gramUnitId,
        price_per_unit: 2830.00,
        min_price_per_unit: 2700.00,
        max_price_per_unit: 2980.00,
        currency: "ETB",
        effective_date: "2026-01-01",
        is_active: true,
        notes: "14 Karat secondary commercial rate.",
        created_at: now,
        updated_at: now,
      },
    ];

    await queryInterface.bulkInsert("gold_price_configurations", sampleConfigs);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("gold_price_configurations");
  },
};
