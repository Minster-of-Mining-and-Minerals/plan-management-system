"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    
    // 1. organization_tenants
    if (!tables.includes("organization_tenants")) {
      await queryInterface.createTable("organization_tenants", {
        tenant_id: {
          type: Sequelize.STRING(64),
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING(150),
          allowNull: false,
          unique: true,
        },
        type: {
          type: Sequelize.STRING(64),
          allowNull: false,
          defaultValue: "HOSPITAL",
        },
        branding_config_json: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        timezone: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: "UTC",
        },
        currency: {
          type: Sequelize.STRING(10),
          allowNull: false,
          defaultValue: "USD",
        },
        country: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: "US",
        },
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: "ACTIVE",
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
    }

    // 2. facilities
    if (!tables.includes("facilities")) {
      await queryInterface.createTable("facilities", {
        facility_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        tenant_id: {
          type: Sequelize.STRING(64),
          allowNull: false,
          defaultValue: "DEFAULT_HOSPITAL",
        },
        name: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        type: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: "HOSPITAL",
        },
        address: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
        },
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: "ACTIVE",
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
    }

    // 3. units
    if (!tables.includes("units")) {
      await queryInterface.createTable("units", {
        unit_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        department_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        facility_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        tenant_id: {
          type: Sequelize.STRING(64),
          allowNull: false,
          defaultValue: "DEFAULT_HOSPITAL",
        },
        name: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: "ACTIVE",
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
    }

    // 4. user_facility_assignments
    if (!tables.includes("user_facility_assignments")) {
      await queryInterface.createTable("user_facility_assignments", {
        assignment_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        tenant_id: {
          type: Sequelize.STRING(64),
          allowNull: false,
          defaultValue: "DEFAULT_HOSPITAL",
        },
        facility_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        role_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        role_name: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: "Staff",
        },
        is_default: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: "ACTIVE",
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
      });
    }

    // 5. patient_facility_records
    if (!tables.includes("patient_facility_records")) {
      await queryInterface.createTable("patient_facility_records", {
        record_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        tenant_id: {
          type: Sequelize.STRING(64),
          allowNull: false,
          defaultValue: "DEFAULT_HOSPITAL",
        },
        facility_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        facility_mrn: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        registration_date: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: "ACTIVE",
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
      });
    }

    // 6. clinical_resources
    if (!tables.includes("clinical_resources")) {
      await queryInterface.createTable("clinical_resources", {
        resource_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        tenant_id: {
          type: Sequelize.STRING(64),
          allowNull: false,
          defaultValue: "DEFAULT_HOSPITAL",
        },
        facility_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        department_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        name: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        resource_type: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: "AVAILABLE",
        },
        metadata_json: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
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
      });
    }

    const addColIfMissing = async (tableName, colName, colSpec) => {
      if (tables.includes(tableName)) {
        const info = await queryInterface.describeTable(tableName);
        if (!info[colName]) {
          await queryInterface.addColumn(tableName, colName, colSpec);
        }
      }
    };

    await addColIfMissing("departments", "facility_id", { type: Sequelize.UUID, allowNull: true });
    await addColIfMissing("departments", "tenant_id", { type: Sequelize.STRING(64), allowNull: false, defaultValue: "DEFAULT_HOSPITAL" });

    await addColIfMissing("diagnosis_form_configs", "tenant_id", { type: Sequelize.STRING(64), allowNull: false, defaultValue: "DEFAULT_HOSPITAL" });
    await addColIfMissing("diagnosis_form_configs", "facility_id", { type: Sequelize.UUID, allowNull: true });

    await addColIfMissing("form_field_groups", "tenant_id", { type: Sequelize.STRING(64), allowNull: false, defaultValue: "DEFAULT_HOSPITAL" });
    await addColIfMissing("form_field_groups", "facility_id", { type: Sequelize.UUID, allowNull: true });

    await addColIfMissing("form_fields", "tenant_id", { type: Sequelize.STRING(64), allowNull: false, defaultValue: "DEFAULT_HOSPITAL" });
    await addColIfMissing("form_fields", "facility_id", { type: Sequelize.UUID, allowNull: true });

    await addColIfMissing("clinical_activity_definitions", "facility_id", { type: Sequelize.UUID, allowNull: true });

    await addColIfMissing("clinical_order_definitions", "facility_id", { type: Sequelize.UUID, allowNull: true });

    await addColIfMissing("clinical_workflow_definitions", "facility_id", { type: Sequelize.UUID, allowNull: true });

    await addColIfMissing("billing_services", "tenant_id", { type: Sequelize.STRING(64), allowNull: false, defaultValue: "DEFAULT_HOSPITAL" });
    await addColIfMissing("billing_services", "facility_id", { type: Sequelize.UUID, allowNull: true });

    await addColIfMissing("clinical_orders", "facility_id", { type: Sequelize.UUID, allowNull: true });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("clinical_resources");
    await queryInterface.dropTable("patient_facility_records");
    await queryInterface.dropTable("user_facility_assignments");
    await queryInterface.dropTable("units");
    await queryInterface.dropTable("facilities");
    await queryInterface.dropTable("organization_tenants");
  },
};
