"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables();

    // 1. Create radiology_procedure_catalogs
    if (!tableExists.includes("radiology_procedure_catalogs")) {
      await queryInterface.createTable("radiology_procedure_catalogs", {
        procedure_catalog_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING(64),
          allowNull: false,
          unique: true,
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        modality: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "XRAY", // XRAY, CT, MRI, ULTRASOUND, FLUOROSCOPY, MAMMOGRAPHY, ECG
        },
        body_region: {
          type: Sequelize.STRING(64),
          allowNull: false,
          defaultValue: "CHEST",
        },
        contrast_required: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        estimated_duration_minutes: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 30,
        },
        billing_service_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "billing_services",
            key: "service_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
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

      await queryInterface.addIndex("radiology_procedure_catalogs", ["modality"]);
      await queryInterface.addIndex("radiology_procedure_catalogs", ["code"]);
    }

    // 2. Create radiology_studies
    if (!tableExists.includes("radiology_studies")) {
      await queryInterface.createTable("radiology_studies", {
        study_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        order_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "clinical_orders",
            key: "order_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        appointment_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "staff_appointments",
            key: "appointment_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        procedure_catalog_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "radiology_procedure_catalogs",
            key: "procedure_catalog_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        accession_number: {
          type: Sequelize.STRING(64),
          allowNull: false,
          unique: true,
        },
        modality: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "XRAY",
        },
        workflow_status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "ORDERED", // ORDERED, SCHEDULED, PATIENT_READY, IN_PROGRESS, IMAGE_ACQUIRED, REPORT_PENDING, VERIFICATION_PENDING, COMPLETED, CANCELLED
        },
        scheduled_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        performed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        assigned_radiographer_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        assigned_radiologist_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
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

      await queryInterface.addIndex("radiology_studies", ["order_id"]);
      await queryInterface.addIndex("radiology_studies", ["patient_id"]);
      await queryInterface.addIndex("radiology_studies", ["workflow_status"]);
      await queryInterface.addIndex("radiology_studies", ["accession_number"]);
    }

    // 3. Create radiology_reports
    if (!tableExists.includes("radiology_reports")) {
      await queryInterface.createTable("radiology_reports", {
        report_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        study_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "radiology_studies",
            key: "study_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        order_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "clinical_orders",
            key: "order_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        result_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "clinical_order_results",
            key: "result_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        findings: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        impression: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        recommendations: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        verification_status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "PRELIMINARY", // PRELIMINARY, FINAL, AMENDED
        },
        reported_by: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        verified_by: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        signed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
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

      await queryInterface.addIndex("radiology_reports", ["study_id"]);
      await queryInterface.addIndex("radiology_reports", ["order_id"]);
      await queryInterface.addIndex("radiology_reports", ["verification_status"]);
    }

    // 4. Create radiology_report_histories
    if (!tableExists.includes("radiology_report_histories")) {
      await queryInterface.createTable("radiology_report_histories", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        report_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "radiology_reports",
            key: "report_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        previous_findings: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        previous_impression: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        previous_recommendations: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        previous_status: {
          type: Sequelize.STRING(32),
          allowNull: false,
        },
        changed_by: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        change_reason: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
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

      await queryInterface.addIndex("radiology_report_histories", ["report_id"]);
    }

    // 5. Create radiology_work_queue_items
    if (!tableExists.includes("radiology_work_queue_items")) {
      await queryInterface.createTable("radiology_work_queue_items", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        study_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "radiology_studies",
            key: "study_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        order_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "clinical_orders",
            key: "order_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        queue_type: {
          type: Sequelize.STRING(32),
          allowNull: false, // SCHEDULING, WAITING, IMAGING, REPORTING, VERIFICATION
        },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "WAITING", // WAITING, CLAIMED, IN_PROGRESS, COMPLETED, CANCELLED
        },
        priority: {
          type: Sequelize.STRING(16),
          allowNull: false,
          defaultValue: "ROUTINE", // STAT, URGENT, ROUTINE
        },
        assigned_staff_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        department_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "departments",
            key: "department_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        entered_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        claimed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        completed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
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

      await queryInterface.addIndex("radiology_work_queue_items", ["queue_type"]);
      await queryInterface.addIndex("radiology_work_queue_items", ["status"]);
      await queryInterface.addIndex("radiology_work_queue_items", ["department_id"]);
      await queryInterface.addIndex("radiology_work_queue_items", ["priority"]);
    }

    // 6. Add radiology_status column to clinical_orders
    const orderTableDescription = await queryInterface.describeTable("clinical_orders");
    if (!orderTableDescription.radiology_status) {
      await queryInterface.addColumn("clinical_orders", "radiology_status", {
        type: Sequelize.STRING(64),
        allowNull: true,
        defaultValue: "WAITING_FOR_SCHEDULE",
      });
    }
  },

  async down(queryInterface) {
    const orderTableDescription = await queryInterface.describeTable("clinical_orders");
    if (orderTableDescription.radiology_status) {
      await queryInterface.removeColumn("clinical_orders", "radiology_status");
    }

    await queryInterface.dropTable("radiology_work_queue_items");
    await queryInterface.dropTable("radiology_report_histories");
    await queryInterface.dropTable("radiology_reports");
    await queryInterface.dropTable("radiology_studies");
    await queryInterface.dropTable("radiology_procedure_catalogs");
  },
};
