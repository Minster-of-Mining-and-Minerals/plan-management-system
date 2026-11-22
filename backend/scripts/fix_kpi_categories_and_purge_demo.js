"use strict";

const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const db = require("../models");

const {
  sequelize,
  NationalReportingRequirement,
  NationalReportingCustomCategory,
  NationalReportingAssignment,
  Region,
} = db;

const category_to_code = {
  "የኮንስትራክሽን ማዕድን 100% ፈቃድ መስጠት (ክብደት 4)": "cat_construction_license",
  "የነዳጅና የነዳጅ ውጤቶች የብቃት ማረጋግጫ ፈቃድ 100% ማስተዳደር (ክብደት 2)": "cat_petroleum_license",
  "የማዕድን ግብይት ሥርዓትን 100 % ማሳደግ (ክብደት 2)": "cat_mineral_marketing",
  "የወጪ ንግድ ማዕድናት": "cat_export_minerals",
  "የግንባታ ግብአት ማዕድናት": "cat_construction_materials",
  "የኢንዱስትሪ ማዕድናት (ለሲሚንቶ፣ ግራናይት፣ ብርጭቆ፣ ሴራሚክስና ብረት)": "cat_industrial_minerals",
  "የሚሰጡ ፈቃዶች": "cat_issued_licenses",
  "የፈቃድ ዕድሳት": "cat_renewed_licenses",
  "የኢንተርፕራይዝ አደረጃጀትና ፈቃድ": "cat_enterprise_org",
  "የሚሰበሰብ ገቢ": "cat_revenue_collection",
  "በዘርፉ የተፈጠረ የስራ ዕድል": "cat_employment_creation",
  "ለሀገር ውስጥ ኢንዱስትሪዎች የሚቀርቡ ማዕድናት": "cat_domestic_industry_supply",
  "ከሀገር ውስጥ ምርት ሽያጭ የሚገኝ ገቢ": "cat_domestic_sales_revenue",
  "ኤክስፖርት የሚደረጉ የማዕድናት ምርት መጠን": "cat_export_volume",
  "በኮንስትራክሽን እና የኢንዱስትሪ ማዕድን ማምረትና በሌሎች የሚፈጠር የስራ ዕድል": "cat_construction_industrial_jobs",
  "የማዕድን አለኝታና ክምችት ጥናት": "cat_reserve_studies",
  "የማዕድን ምርትና ፍትሃዊ ተጠቃሚነት ማሳደግ": "cat_equitable_benefit",
  "የማዕድን ምርትን ተፅዕኖ መቀነስና ማካካስ": "cat_impact_mitigation",
  "በዘርፉ የሚፈጠር የስራ ዕድል": "cat_sector_jobs_projection",
  "የአካባቢ ጥበቃና መልሶ ማልማት": "cat_environmental_protection",
  "የስነ ምግባርና ፀረ ሙስና የክትትል ሥራዎችን ማሻሻል": "cat_ethics_anticorruption",
  "የሴቶችና ወጣቶች ማሕበራዊ ተሳታፊነትንና ተጠቃሚነትን ማሻሻል": "cat_social_inclusion",
  "የበጎ አድራጎት እና የማህበረሰብ አገልግሎት ሥራዎችን ማሻሻል": "cat_community_service",
  "በነባርና አዳዲስ የማዕድን ማምረቻ ይዞታዎች ላይ ፈቃድ መስጠትና ቦታ ማስረከብ": "cat_site_handover_licenses",
  "ከኤክስፖርት ማዕድን ምርት ግብይት ማጠናከር": "cat_export_trade_strengthening",
  "የኢንዱስትሪና የኮንስትራክሽን ማዕድናት ምርት መጠን ማሳደግ": "cat_industrial_construction_volume",
  "ማዕድን ክፍለ ኢኮኖሚ የሀገር ውስጥ ገቢ ማሳደግ": "cat_mining_economy_revenue",
  "በማዕድን ምርት ምክንያት የተጎዱ ቦታዎችን በመለየት መልሶ ማልማት": "cat_environmental_rehabilitation",
  "በባህላዊና ልዩ አነስተኛ የሚፈጠርየስራ እድል": "cat_artisanal_jobs",
};

const canonicalCategoryDefs = [
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

async function runFix() {
  console.log("================================================================");
  console.log("STARTING CANONICAL CATEGORY SEEDING & KPI CATEGORIZATION REWORK");
  console.log("================================================================");

  const t = await sequelize.transaction();

  try {
    // 1. Purge ALL English demo / measurement categories from national_reporting_custom_categories
    const demoCodes = [
      "mass", "volume", "count", "percentage", "area", "currency",
      "cadastre_licensing", "revenue_royalties", "inspections_compliance",
      "artisanal_cooperatives", "geological_exploration",
      "mining_production", "mineral_exploration", "industrial_capacity",
      "revenue_generation", "environmental_compliance", "mining_and_extractive",
      "artisanal_mining", "safety_and_inspections",
    ];

    const purgedCount = await NationalReportingCustomCategory.destroy({
      where: {
        code: {
          [Op.in]: demoCodes,
        },
      },
      transaction: t,
    });
    console.log(`[1] Purged ${purgedCount} demo/measurement categories from custom categories table.`);

    // 2. Ensure all 29 canonical categories exist in DB
    for (const def of canonicalCategoryDefs) {
      const existing = await NationalReportingCustomCategory.findOne({
        where: { code: def.code },
        transaction: t,
      });

      if (!existing) {
        await NationalReportingCustomCategory.create(
          {
            code: def.code,
            label: def.label,
            icon: def.icon,
            mandate_level: def.mandate_level,
            frequency_default: def.frequency_default,
            typical_units: [],
          },
          { transaction: t }
        );
      } else {
        existing.label = def.label;
        existing.icon = def.icon;
        await existing.save({ transaction: t });
      }
    }
    console.log("[2] Ensured all 29 canonical categories exist with correct Amharic labels and icons.");

    // 3. Build KPI-to-Category mapping from regional_mining_plan_kpis.json
    const kpiFilePath = path.join(__dirname, "../kpi/regional_mining_plan_kpis.json");
    const kpiData = JSON.parse(fs.readFileSync(kpiFilePath, "utf8"));
    const kpiToCode = new Map();

    for (const entry of kpiData) {
      const catCode = category_to_code[entry.category.trim()];
      if (!catCode) continue;
      for (const kpi of entry["kpi-list"] || []) {
        const norm = kpi.trim().toLowerCase();
        if (!kpiToCode.has(norm)) {
          kpiToCode.set(norm, catCode);
        }
      }
    }
    console.log(`[3] Loaded canonical mappings for ${kpiToCode.size} unique KPIs from JSON.`);

    // 4. Update all requirements in database
    const allRequirements = await NationalReportingRequirement.findAll({ transaction: t });
    let updatedReqs = 0;

    for (const r of allRequirements) {
      const normTitle = r.title.trim().toLowerCase();
      const targetCategory = kpiToCode.get(normTitle) || "cat_export_minerals";

      if (r.category !== targetCategory) {
        r.category = targetCategory;
        await r.save({ transaction: t });
        updatedReqs++;
      }
    }
    console.log(`[4] Updated ${updatedReqs} requirements to their canonical real categories.`);

    await t.commit();

    // 5. Verification Printouts
    const finalReqs = await NationalReportingRequirement.findAll({ attributes: ["category"] });
    const dist = {};
    finalReqs.forEach((r) => (dist[r.category] = (dist[r.category] || 0) + 1));

    const finalCats = await NationalReportingCustomCategory.findAll({ attributes: ["code", "label"] });

    console.log("\n==================== VERIFICATION SUMMARY ====================");
    console.log(`Total Canonical Categories in DB: ${finalCats.length}`);
    console.log(`Total Requirements in DB: ${finalReqs.length}`);
    console.log("\nDistribution by Category Code:");
    for (const [code, count] of Object.entries(dist)) {
      console.log(`  ${code}: ${count} requirements`);
    }
    console.log("================================================================");

    process.exit(0);
  } catch (err) {
    await t.rollback();
    console.error("[ERROR] Failed to run canonical categorization:", err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runFix();
