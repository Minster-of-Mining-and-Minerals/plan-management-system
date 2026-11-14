"use strict";

const DEFAULT_CONFIGS = [
  {
    frequency: "monthly",
    display_title: "Monthly Reporting Divisions",
    division_count: 12,
    divisions: JSON.stringify([
      { index: 1, division_key: "Month 1", default_name: "Month 1", custom_name: "Month 1 / Hamle (ሐምሌ)", short_code: "M1" },
      { index: 2, division_key: "Month 2", default_name: "Month 2", custom_name: "Month 2 / Nehase (ነሐሴ)", short_code: "M2" },
      { index: 3, division_key: "Month 3", default_name: "Month 3", custom_name: "Month 3 / Meskerem (መስከረም)", short_code: "M3" },
      { index: 4, division_key: "Month 4", default_name: "Month 4", custom_name: "Month 4 / Tikimt (ጥቅምት)", short_code: "M4" },
      { index: 5, division_key: "Month 5", default_name: "Month 5", custom_name: "Month 5 / Hidar (ኅዳር)", short_code: "M5" },
      { index: 6, division_key: "Month 6", default_name: "Month 6", custom_name: "Month 6 / Tahsas (ታኅሣሥ)", short_code: "M6" },
      { index: 7, division_key: "Month 7", default_name: "Month 7", custom_name: "Month 7 / Tir (ጥር)", short_code: "M7" },
      { index: 8, division_key: "Month 8", default_name: "Month 8", custom_name: "Month 8 / Yakatit (የካቲት)", short_code: "M8" },
      { index: 9, division_key: "Month 9", default_name: "Month 9", custom_name: "Month 9 / Magabit (መጋቢት)", short_code: "M9" },
      { index: 10, division_key: "Month 10", default_name: "Month 10", custom_name: "Month 10 / Miyazia (ሚያዝያ)", short_code: "M10" },
      { index: 11, division_key: "Month 11", default_name: "Month 11", custom_name: "Month 11 / Ginbot (ግንቦት)", short_code: "M11" },
      { index: 12, division_key: "Month 12", default_name: "Month 12", custom_name: "Month 12 / Sene (ሰኔ)", short_code: "M12" },
    ]),
  },
  {
    frequency: "quarterly",
    display_title: "Quarterly Reporting Divisions",
    division_count: 4,
    divisions: JSON.stringify([
      { index: 1, division_key: "Q1", default_name: "Quarter 1", custom_name: "Quarter 1 (Q1)", short_code: "Q1" },
      { index: 2, division_key: "Q2", default_name: "Quarter 2", custom_name: "Quarter 2 (Q2)", short_code: "Q2" },
      { index: 3, division_key: "Q3", default_name: "Quarter 3", custom_name: "Quarter 3 (Q3)", short_code: "Q3" },
      { index: 4, division_key: "Q4", default_name: "Quarter 4", custom_name: "Quarter 4 (Q4)", short_code: "Q4" },
    ]),
  },
  {
    frequency: "semi_annually",
    display_title: "Semi-Annual Reporting Divisions",
    division_count: 2,
    divisions: JSON.stringify([
      { index: 1, division_key: "Semester 1", default_name: "Semester 1", custom_name: "First Half (H1)", short_code: "H1" },
      { index: 2, division_key: "Semester 2", default_name: "Semester 2", custom_name: "Second Half (H2)", short_code: "H2" },
    ]),
  },
  {
    frequency: "annually",
    display_title: "Annual Reporting Division",
    division_count: 1,
    divisions: JSON.stringify([
      { index: 1, division_key: "Annual", default_name: "Annual", custom_name: "Annual Full Fiscal Year", short_code: "Annual" },
    ]),
  },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.tableExists("national_reporting_period_configs");
    if (!tableExists) {
      await queryInterface.createTable("national_reporting_period_configs", {
        config_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        frequency: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true,
        },
        display_title: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        division_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        divisions: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        updated_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("now"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("now"),
        },
      });

      for (const item of DEFAULT_CONFIGS) {
        await queryInterface.bulkInsert("national_reporting_period_configs", [
          {
            config_id: Sequelize.fn("gen_random_uuid"),
            frequency: item.frequency,
            display_title: item.display_title,
            division_count: item.division_count,
            divisions: item.divisions,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("national_reporting_period_configs");
  },
};

