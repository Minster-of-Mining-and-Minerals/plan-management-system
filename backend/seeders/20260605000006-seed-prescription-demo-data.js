"use strict";

const { v4: uuidv4 } = require("uuid");
const { DEFAULT_PRESCRIPTION_DOCUMENT_HTML } = require("../config/defaultPrescriptionDocumentTemplate");

const DEFAULT_BRANDING_ID = "00000000-0000-4000-8000-000000000005";
const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";

const LAVISTA_BRANDING = {
  system_name: "LaVista General Hospital",
  system_name_am: "ላቪስታ ጠቅላላ ሆስፒታል",
  tagline: "Excellence in Patient Care — LaVista",
  organization_address: "LaVista Tower, Bole Road, 3rd Floor",
  organization_city: "Addis Ababa",
  organization_region: "Addis Ababa",
  organization_country: "Ethiopia",
  organization_branch: "LaVista Medical Center — Main Campus",
  contact_phone: "+251 11 123 4567",
  contact_email: "prescriptions@lavista.et",
  license_info: "MOH License #LAV-2024-001 · LaVista Health Group",
};

const TEMPLATE_DEFINITIONS = [
  {
    code: "fever_medication",
    category: "drug",
    name: "Standard Fever Medication",
    description: "Common antipyretic and supportive care for febrile illness",
    has_template_signature: true,
    items: [
      {
        item_name: "Paracetamol 500mg",
        strength: "500mg",
        dosage: "1 tablet",
        frequency: "TDS (three times daily)",
        route: "Oral",
        duration: "5 days",
        instructions: "Take after meals with water",
        quantity: "15 tablets",
      },
      {
        item_name: "Oral Rehydration Salts",
        strength: "—",
        dosage: "1 sachet",
        frequency: "After each loose stool",
        route: "Oral",
        duration: "3 days",
        instructions: "Dissolve in 200ml clean water",
        quantity: "6 sachets",
      },
    ],
  },
  {
    code: "hypertension_rx",
    category: "drug",
    name: "Hypertension Medication",
    description: "First-line antihypertensive regimen",
    has_template_signature: false,
    items: [
      {
        item_name: "Amlodipine 5mg",
        strength: "5mg",
        dosage: "1 tablet",
        frequency: "Once daily",
        route: "Oral",
        duration: "30 days",
        instructions: "Take at the same time each morning",
        quantity: "30 tablets",
      },
      {
        item_name: "Lisinopril 10mg",
        strength: "10mg",
        dosage: "1 tablet",
        frequency: "Once daily",
        route: "Oral",
        duration: "30 days",
        instructions: "Monitor blood pressure weekly",
        quantity: "30 tablets",
      },
    ],
  },
  {
    code: "eye_glasses_rx",
    category: "glasses",
    name: "Eye Glass Prescription",
    description: "Refractive correction — distance vision (Sphere / Cylinder / Axis / Addition / Prism)",
    items: [
      {
        item_name: "Right eye",
        strength: "+1.50",
        dosage: "-0.50",
        frequency: "180",
        duration: "+2.00",
        route: "—",
        instructions: "Full-time wear",
        quantity: "—",
      },
      {
        item_name: "Left eye",
        strength: "+1.25",
        dosage: "-0.25",
        frequency: "175",
        duration: "+2.00",
        route: "—",
        instructions: "PD 62mm at dispensing",
        quantity: "—",
      },
    ],
  },
  {
    code: "chest_xray",
    category: "imaging",
    name: "Chest X-Ray Request",
    description: "Radiology requisition for chest imaging",
    items: [
      {
        item_name: "Chest X-Ray (PA & Lateral)",
        strength: "—",
        dosage: "—",
        frequency: "Once",
        route: "—",
        duration: "—",
        instructions: "Clinical indication: persistent cough × 2 weeks. Rule out pneumonia.",
        quantity: "1 study",
      },
    ],
  },
  {
    code: "wound_dressing",
    category: "procedure",
    name: "Minor Wound Dressing",
    description: "Outpatient wound care procedure",
    items: [
      {
        item_name: "Wound cleaning & dressing",
        strength: "—",
        dosage: "—",
        frequency: "Every 48 hours",
        route: "Topical",
        duration: "7 days",
        instructions: "Use sterile saline, apply iodine-based dressing",
        quantity: "4 sessions",
      },
    ],
  },
  {
    code: "vitamin_b12_inj",
    category: "injection",
    name: "Vitamin B12 Injection",
    description: "IM cyanocobalamin supplementation",
    has_template_signature: true,
    items: [
      {
        item_name: "Cyanocobalamin (Vitamin B12)",
        strength: "1000 mcg/ml",
        dosage: "1 ml",
        frequency: "Once weekly",
        route: "IM (deltoid)",
        duration: "4 weeks",
        instructions: "Administer by trained nurse. Observe 15 min post-injection.",
        quantity: "4 ampoules",
      },
    ],
  },
  {
    code: "lower_back_physio",
    category: "physiotherapy",
    name: "Lower Back Physiotherapy",
    description: "Physiotherapy plan for mechanical low back pain",
    items: [
      {
        item_name: "Physiotherapy sessions",
        strength: "—",
        dosage: "45 min session",
        frequency: "Twice weekly",
        route: "—",
        duration: "4 weeks",
        instructions: "Core strengthening, lumbar mobilisation, home exercise programme",
        quantity: "8 sessions",
      },
    ],
  },
  {
    code: "cardiology_referral",
    category: "referral",
    name: "Cardiology Referral",
    description: "Referral to cardiology specialist",
    items: [
      {
        item_name: "Referral to Cardiology",
        strength: "—",
        dosage: "—",
        frequency: "—",
        route: "—",
        duration: "—",
        instructions:
          "Reason: exertional chest pain, abnormal ECG. Urgency: routine within 2 weeks.",
        quantity: "1 referral",
      },
    ],
  },
  {
    code: "diabetic_diet",
    category: "diet",
    name: "Diabetic Diet Recommendation",
    description: "Medical nutrition therapy for Type 2 DM",
    items: [
      {
        item_name: "Diabetic meal plan",
        strength: "—",
        dosage: "1800 kcal/day",
        frequency: "Daily",
        route: "—",
        duration: "Ongoing",
        instructions:
          "Low GI carbohydrates, limit simple sugars, 5 small meals, increase fibre and vegetables",
        quantity: "—",
      },
      {
        item_name: "Fluid intake",
        strength: "—",
        dosage: "2–2.5 L/day",
        frequency: "Daily",
        route: "—",
        duration: "Ongoing",
        instructions: "Water preferred; avoid sugary drinks",
        quantity: "—",
      },
    ],
  },
  {
    code: "bp_monitor",
    category: "equipment",
    name: "Blood Pressure Monitor",
    description: "Home BP monitoring device recommendation",
    items: [
      {
        item_name: "Automatic upper-arm BP monitor",
        strength: "—",
        dosage: "—",
        frequency: "Twice daily",
        route: "—",
        duration: "Ongoing",
        instructions:
          "Measure before breakfast and before dinner. Record readings in patient log.",
        quantity: "1 device",
      },
    ],
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const brandingUpdate = {
      ...LAVISTA_BRANDING,
      updated_at: now,
    };

    const [activeBranding] = await queryInterface.sequelize.query(
      `SELECT branding_id FROM system_branding WHERE is_active = true LIMIT 1`
    );
    if (activeBranding.length) {
      await queryInterface.bulkUpdate(
        "system_branding",
        brandingUpdate,
        { branding_id: activeBranding[0].branding_id }
      );
    } else {
      await queryInterface.bulkUpdate(
        "system_branding",
        brandingUpdate,
        { branding_id: DEFAULT_BRANDING_ID }
      );
    }

    await queryInterface.sequelize.query(
      `UPDATE prescription_document_templates
       SET html_content = :html, updated_at = :now
       WHERE code = 'standard_rx'`,
      {
        replacements: { html: DEFAULT_PRESCRIPTION_DOCUMENT_HTML, now },
      }
    );

    let [categories] = await queryInterface.sequelize.query(
      `SELECT category_id, code FROM prescription_categories WHERE status = 'active'`
    );

    if (!categories.length) {
      const defaultCategories = [
        { code: "drug", name: "Medication / Drug", description: "Standard pharmaceutical drugs and medications", sort_order: 1 },
        { code: "glasses", name: "Glasses & Vision", description: "Ophthalmic and spectacle prescriptions", sort_order: 2 },
        { code: "imaging", name: "Radiology & Imaging", description: "X-Rays, CT, MRI, and Ultrasound requisitions", sort_order: 3 },
        { code: "procedure", name: "Medical Procedures", description: "Clinical procedures and minor surgeries", sort_order: 4 },
        { code: "injection", name: "Injections & IV", description: "Injectable medications and infusions", sort_order: 5 },
        { code: "physiotherapy", name: "Physiotherapy", description: "Rehabilitation and physical therapy", sort_order: 6 },
        { code: "referral", name: "Specialist Referral", description: "Specialist consultations and referrals", sort_order: 7 },
        { code: "diet", name: "Diet & Nutrition", description: "Medical nutrition therapy and meal plans", sort_order: 8 },
        { code: "equipment", name: "Medical Equipment", description: "Durable medical equipment and devices", sort_order: 9 },
      ];

      for (const cat of defaultCategories) {
        await queryInterface.bulkInsert("prescription_categories", [
          {
            category_id: uuidv4(),
            name: cat.name,
            code: cat.code,
            description: cat.description,
            sort_order: cat.sort_order,
            status: "active",
            created_at: now,
            updated_at: now,
          },
        ]);
      }

      [categories] = await queryInterface.sequelize.query(
        `SELECT category_id, code FROM prescription_categories WHERE status = 'active'`
      );
    }

    const categoryByCode = Object.fromEntries(categories.map((c) => [c.code, c.category_id]));

    for (const def of TEMPLATE_DEFINITIONS) {
      const categoryId = categoryByCode[def.category];
      if (!categoryId) continue;

      const [existing] = await queryInterface.sequelize.query(
        `SELECT template_id FROM prescription_templates WHERE code = :code LIMIT 1`,
        { replacements: { code: def.code } }
      );
      if (existing.length) continue;

      const templateId = uuidv4();
      await queryInterface.bulkInsert("prescription_templates", [
        {
          template_id: templateId,
          category_id: categoryId,
          name: def.name,
          code: def.code,
          description: def.description || null,
          template_type: def.category,
          template_content: null,
          has_template_signature: Boolean(def.has_template_signature),
          template_signature_file: null,
          allow_user_signature_override: true,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      ]);

      const itemRows = def.items.map((item, index) => ({
        item_id: uuidv4(),
        template_id: templateId,
        item_name: item.item_name,
        strength: item.strength || null,
        route: item.route || null,
        dosage: item.dosage || null,
        frequency: item.frequency || null,
        duration: item.duration || null,
        instructions: item.instructions || null,
        quantity: item.quantity || null,
        notes: item.notes || null,
        sort_order: index,
        created_at: now,
        updated_at: now,
      }));
      await queryInterface.bulkInsert("prescription_template_items", itemRows);
    }

    await queryInterface.sequelize.query(
      `UPDATE internal_user_profiles
       SET signature_enabled = false, updated_at = :now
       WHERE user_id = :userId AND (signature_file IS NULL OR signature_file LIKE '%nova-cure-logo%')`,
      {
        replacements: { now, userId: ADMIN_USER_ID },
      }
    );
  },

  async down(queryInterface) {
    const codes = TEMPLATE_DEFINITIONS.map((t) => t.code);
    await queryInterface.sequelize.query(
      `DELETE FROM prescription_template_items
       WHERE template_id IN (
         SELECT template_id FROM prescription_templates WHERE code IN (:codes)
       )`,
      { replacements: { codes } }
    );
    await queryInterface.bulkDelete("prescription_templates", {
      code: codes,
    });
    await queryInterface.sequelize.query(
      `UPDATE internal_user_profiles
       SET signature_file = NULL, signature_enabled = false
       WHERE user_id = :userId`,
      { replacements: { userId: ADMIN_USER_ID } }
    );
  },
};
