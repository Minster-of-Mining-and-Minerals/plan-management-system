"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables();

    // 1. Create radiology_images
    if (!tableExists.includes("radiology_images")) {
      await queryInterface.createTable("radiology_images", {
        id: {
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
        study_instance_uid: {
          type: Sequelize.STRING(128),
          allowNull: false,
        },
        series_instance_uid: {
          type: Sequelize.STRING(128),
          allowNull: true,
        },
        sop_instance_uid: {
          type: Sequelize.STRING(128),
          allowNull: true,
        },
        modality: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "XRAY",
        },
        image_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        storage_type: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "LOCAL", // LOCAL, PACS, S3, ORTHANC, DCM4CHEE
        },
        storage_location: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        viewer_url: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        uploaded_by: {
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
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      });

      await queryInterface.addIndex("radiology_images", ["study_id"]);
      await queryInterface.addIndex("radiology_images", ["study_instance_uid"]);
    }

    // 2. Create radiology_study_series
    if (!tableExists.includes("radiology_study_series")) {
      await queryInterface.createTable("radiology_study_series", {
        id: {
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
        series_uid: {
          type: Sequelize.STRING(128),
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        modality: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "XRAY",
        },
        body_part: {
          type: Sequelize.STRING(64),
          allowNull: true,
        },
        instance_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
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

      await queryInterface.addIndex("radiology_study_series", ["study_id"]);
      await queryInterface.addIndex("radiology_study_series", ["series_uid"]);
    }

    // 3. Create radiology_clinical_reviews
    if (!tableExists.includes("radiology_clinical_reviews")) {
      await queryInterface.createTable("radiology_clinical_reviews", {
        id: {
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
        doctor_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        review_status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "PENDING", // PENDING, REVIEWED, ACKNOWLEDGED
        },
        review_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        clinical_decision: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        reviewed_at: {
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

      await queryInterface.addIndex("radiology_clinical_reviews", ["study_id"]);
      await queryInterface.addIndex("radiology_clinical_reviews", ["doctor_id"]);
      await queryInterface.addIndex("radiology_clinical_reviews", ["review_status"]);
    }

    // 4. Add patient_release_status column to radiology_reports
    const reportTableDescription = await queryInterface.describeTable("radiology_reports");
    if (!reportTableDescription.patient_release_status) {
      await queryInterface.addColumn("radiology_reports", "patient_release_status", {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "NOT_RELEASED", // NOT_RELEASED, RELEASED, WITHHELD
      });
    }
  },

  async down(queryInterface) {
    const reportTableDescription = await queryInterface.describeTable("radiology_reports");
    if (reportTableDescription.patient_release_status) {
      await queryInterface.removeColumn("radiology_reports", "patient_release_status");
    }

    await queryInterface.dropTable("radiology_clinical_reviews");
    await queryInterface.dropTable("radiology_study_series");
    await queryInterface.dropTable("radiology_images");
  },
};
