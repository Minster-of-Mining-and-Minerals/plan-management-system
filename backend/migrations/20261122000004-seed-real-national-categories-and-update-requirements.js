"use strict";

const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Purge demo categories from national_reporting_custom_categories
      const demoCodes = [
        "mining_production",
        "mineral_exploration",
        "industrial_capacity",
        "revenue_generation",
        "environmental_compliance",
        "mining_and_extractive",
      ];

      await queryInterface.bulkDelete(
        "national_reporting_custom_categories",
        {
          code: {
            [Sequelize.Op.in]: demoCodes,
          },
        },
        { transaction }
      );

      // 2. Define the 29 canonical categories from regional_mining_plan_kpis.json
      const categoryDefinitions = [
        { code: "cat_construction_license", label: "የኮንስትራክሽን ማዕድን 100% ፈቃድ መስጠት (ክብደት 4)", icon: "📜", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_petroleum_license", label: "የነዳጅና የነዳጅ ውጤቶች የብቃት ማረጋግጫ ፈቃድ 100% ማስተዳደር (ክብደት 2)", icon: "⛽", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_mineral_marketing", label: "የማዕድን ግብይት ሥርዓትን 100 % ማሳደግ (ክብደት 2)", icon: "⚖️", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_export_minerals", label: "የወጪ ንግድ ማዕድናት", icon: "💎", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_construction_materials", label: "የግንባታ ግብአት ማዕድናት", icon: "🏗️", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_industrial_minerals", label: "የኢንዱስትሪ ማዕድናት (ለሲሚንቶ፣ ግራናይት፣ ብርጭቆ፣ ሴራሚክስና ብረት)", icon: "🏭", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_issued_licenses", label: "የሚሰጡ ፈቃዶች", icon: "📜", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_renewed_licenses", label: "የፈቃድ ዕድሳት", icon: "🔄", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_enterprise_org", label: "የኢንተርፕራይዝ አደረጃጀትና ፈቃድ", icon: "🏢", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_revenue_collection", label: "የሚሰበሰብ ገቢ", icon: "💰", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_employment_creation", label: "በዘርፉ የተፈጠረ የስራ ዕድል", icon: "👷", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_domestic_industry_supply", label: "ለሀገር ውስጥ ኢንዱስትሪዎች የሚቀርቡ ማዕድናት", icon: "🚚", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_domestic_sales_revenue", label: "ከሀገር ውስጥ ምርት ሽያጭ የሚገኝ ገቢ", icon: "💵", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_export_volume", label: "ኤክስፖርት የሚደረጉ የማዕድናት ምርት መጠን", icon: "🚢", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_construction_industrial_jobs", label: "በኮንስትራክሽን እና የኢንዱስትሪ ማዕድን ማምረትና በሌሎች የሚፈጠር የስራ ዕድል", icon: "👥", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_reserve_studies", label: "የማዕድን አለኝታና ክምችት ጥናት", icon: "🔬", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_equitable_benefit", label: "የማዕድን ምርትና ፍትሃዊ ተጠቃሚነት ማሳደግ", icon: "🤝", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_impact_mitigation", label: "የማዕድን ምርትን ተፅዕኖ መቀነስና ማካካስ", icon: "🛡️", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_sector_jobs_projection", label: "በዘርፉ የሚፈጠር የስራ ዕድል", icon: "👷", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_environmental_protection", label: "የአካባቢ ጥበቃና መልሶ ማልማት", icon: "🌲", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_ethics_anticorruption", label: "የስነ ምግባርና ፀረ ሙስና የክትትል ሥራዎችን ማሻሻል", icon: "🛡️", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_social_inclusion", label: "የሴቶችና ወጣቶች ማሕበራዊ ተሳታፊነትንና ተጠቃሚነትን ማሻሻል", icon: "🌟", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_community_service", label: "የበጎ አድራጎት እና የማህበረሰብ አገልግሎት ሥራዎችን ማሻሻል", icon: "❤️", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_site_handover_licenses", label: "በነባርና አዳዲስ የማዕድን ማምረቻ ይዞታዎች ላይ ፈቃድ መስጠትና ቦታ ማስረከብ", icon: "📍", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_export_trade_strengthening", label: "ከኤክስፖርት ማዕድን ምርት ግብይት ማጠናከር", icon: "🌐", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_industrial_construction_volume", label: "የኢንዱስትሪና የኮንስትራክሽን ማዕድናት ምርት መጠን ማሳደግ", icon: "🏗️", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_mining_economy_revenue", label: "ማዕድን ክፍለ ኢኮኖሚ የሀገር ውስጥ ገቢ ማሳደግ", icon: "📈", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_environmental_rehabilitation", label: "በማዕድን ምርት ምክንያት የተጎዱ ቦታዎችን በመለየት መልሶ ማልማት", icon: "🌱", frequency_default: "monthly", mandate_level: "mandatory_default" },
        { code: "cat_artisanal_jobs", label: "በባህላዊና ልዩ አነስተኛ የሚፈጠርየስራ እድል", icon: "⛏️", frequency_default: "monthly", mandate_level: "mandatory_default" },
      ];

      for (const def of categoryDefinitions) {
        const [existing] = await queryInterface.sequelize.query(
          `SELECT category_id FROM national_reporting_custom_categories WHERE code = :code LIMIT 1;`,
          {
            replacements: { code: def.code },
            transaction,
          }
        );

        if (!existing || existing.length === 0) {
          await queryInterface.bulkInsert(
            "national_reporting_custom_categories",
            [
              {
                category_id: uuidv4(),
                code: def.code,
                label: def.label,
                icon: def.icon,
                mandate_level: def.mandate_level,
                frequency_default: def.frequency_default,
                typical_units: JSON.stringify([]),
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            { transaction }
          );
        }
      }

      // 3. Update any requirements using old demo categories to real category
      await queryInterface.bulkUpdate(
        "national_reporting_requirements",
        {
          category: "cat_export_minerals",
          updated_at: new Date(),
        },
        {
          category: {
            [Sequelize.Op.in]: demoCodes,
          },
        },
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Non-destructive rollback
  },
};
