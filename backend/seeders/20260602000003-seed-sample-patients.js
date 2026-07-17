"use strict";

const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const { ensurePatientFormCatalog } = require("../services/patientFormSeedService");
const { assignPatientCodes } = require("../services/qrBarcodeService");
const { assertDemoSeedAllowed } = require("../utils/assertDemoSeedAllowed");
const { assertDemoSeedAllowed } = require("../utils/assertDemoSeedAllowed");

const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";
const DEMO_EMAIL_DOMAIN = "@patient.demo.novacure";

const SAMPLE_PATIENTS = [
  {
    full_name: "Amanuel Tadesse Bekele",
    email: "amanuel.tadesse" + DEMO_EMAIL_DOMAIN,
    phone_number: "0911234567",
    gender: "Male",
    date_of_birth: "1990-05-12",
    father_name: "Tadesse Bekele",
    grandfather_name: "Bekele Wolde",
    marital_status: "Married",
    nationality: "Ethiopian",
    blood_type: "O+",
    occupation: "Software Engineer",
    preferred_language: "Amharic",
    emergency_contact_name: "Sara Tadesse",
    emergency_contact_relationship: "Spouse",
    emergency_contact_phone: "0912345678",
    emergency_contact_address: "Bole, Addis Ababa",
    insurance_provider: "Nyala Insurance",
    insurance_policy_number: "NYL-10001",
    insurance_group_number: "GRP-A1",
    insurance_coverage_type: "Employer",
    insurance_policy_holder: "Amanuel Tadesse Bekele",
    allergies: "Penicillin",
    chronic_conditions: "Hypertension",
    current_medications: "Amlodipine 5mg daily",
    medical_history_notes: "Routine follow-up every 6 months.",
    street_address: "Bole Road, House 12",
    city: "Addis Ababa",
    region: "Addis Ababa",
    postal_code: "1000",
    country: "Ethiopia",
  },
  {
    full_name: "Hanna Mekonnen Girma",
    email: "hanna.mekonnen" + DEMO_EMAIL_DOMAIN,
    phone_number: "0922234567",
    gender: "Female",
    date_of_birth: "1995-08-22",
    father_name: "Mekonnen Girma",
    grandfather_name: "Girma Haile",
    marital_status: "Single",
    nationality: "Ethiopian",
    blood_type: "A+",
    occupation: "Nurse",
    preferred_language: "Amharic",
    emergency_contact_name: "Mekonnen Girma",
    emergency_contact_relationship: "Parent",
    emergency_contact_phone: "0933345678",
    emergency_contact_address: "Kirkos, Addis Ababa",
    insurance_provider: "Ethiopian Insurance Corporation",
    insurance_policy_number: "EIC-20002",
    insurance_coverage_type: "Government",
    allergies: "None known",
    chronic_conditions: "",
    street_address: "Mexico Square",
    city: "Addis Ababa",
    country: "Ethiopia",
  },
  {
    full_name: "Dawit Haile Alemu",
    email: "dawit.haile" + DEMO_EMAIL_DOMAIN,
    phone_number: "0933234567",
    gender: "Male",
    date_of_birth: "1988-01-30",
    father_name: "Haile Alemu",
    marital_status: "Married",
    nationality: "Ethiopian",
    blood_type: "B+",
    occupation: "Teacher",
    preferred_language: "Amharic",
    emergency_contact_name: "Tigist Haile",
    emergency_contact_relationship: "Spouse",
    emergency_contact_phone: "0944456789",
    city: "Hawassa",
    region: "Sidama",
    country: "Ethiopia",
  },
  {
    full_name: "Selamawit Kebede Desta",
    email: "selamawit.kebede" + DEMO_EMAIL_DOMAIN,
    phone_number: "0944234567",
    gender: "Female",
    date_of_birth: "2000-11-03",
    father_name: "Kebede Desta",
    marital_status: "Single",
    nationality: "Ethiopian",
    blood_type: "AB+",
    occupation: "Student",
    preferred_language: "English",
    emergency_contact_name: "Desta Kebede",
    emergency_contact_relationship: "Parent",
    emergency_contact_phone: "0955567890",
    city: "Bahir Dar",
    region: "Amhara",
    country: "Ethiopia",
  },
  {
    full_name: "Yonas Getachew Tesfaye",
    email: "yonas.getachew" + DEMO_EMAIL_DOMAIN,
    phone_number: "0955234567",
    gender: "Male",
    date_of_birth: "1982-07-18",
    father_name: "Getachew Tesfaye",
    grandfather_name: "Tesfaye Mulatu",
    marital_status: "Married",
    nationality: "Ethiopian",
    blood_type: "O-",
    occupation: "Accountant",
    preferred_language: "Amharic",
    insurance_coverage_type: "Private",
    chronic_conditions: "Type 2 Diabetes",
    current_medications: "Metformin 500mg",
    city: "Mekelle",
    region: "Tigray",
    country: "Ethiopia",
  },
  {
    full_name: "Rahel Assefa Worku",
    email: "rahel.assefa" + DEMO_EMAIL_DOMAIN,
    phone_number: "0966234567",
    gender: "Female",
    date_of_birth: "1993-04-25",
    father_name: "Assefa Worku",
    marital_status: "Married",
    nationality: "Ethiopian",
    blood_type: "A-",
    occupation: "Pharmacist",
    preferred_language: "Amharic",
    emergency_contact_name: "Worku Assefa",
    emergency_contact_relationship: "Parent",
    emergency_contact_phone: "0977789012",
    city: "Adama",
    region: "Oromia",
    country: "Ethiopia",
  },
  {
    full_name: "Bereket Solomon Hailu",
    email: "bereket.solomon" + DEMO_EMAIL_DOMAIN,
    phone_number: "0977234567",
    gender: "Male",
    date_of_birth: "1979-12-01",
    father_name: "Solomon Hailu",
    marital_status: "Married",
    nationality: "Ethiopian",
    blood_type: "B-",
    occupation: "Driver",
    preferred_language: "Oromo",
    allergies: "Sulfa drugs",
    city: "Jimma",
    region: "Oromia",
    country: "Ethiopia",
  },
  {
    full_name: "Meron Teshome Arega",
    email: "meron.teshome" + DEMO_EMAIL_DOMAIN,
    phone_number: "0988234567",
    gender: "Female",
    date_of_birth: "1998-09-14",
    father_name: "Teshome Arega",
    marital_status: "Single",
    nationality: "Ethiopian",
    blood_type: "O+",
    occupation: "Graphic Designer",
    preferred_language: "English",
    guardian_name: "Arega Teshome",
    guardian_relationship: "Parent",
    guardian_phone: "0999901234",
    city: "Addis Ababa",
    country: "Ethiopia",
  },
  {
    full_name: "Fitsum Demissie Lemma",
    email: "fitsum.demissie" + DEMO_EMAIL_DOMAIN,
    phone_number: "0999234567",
    gender: "Male",
    date_of_birth: "1985-06-08",
    father_name: "Demissie Lemma",
    marital_status: "Divorced",
    nationality: "Ethiopian",
    blood_type: "AB-",
    occupation: "Civil Servant",
    preferred_language: "Amharic",
    insurance_provider: "United Insurance",
    insurance_policy_number: "UNI-90009",
    city: "Gondar",
    region: "Amhara",
    country: "Ethiopia",
  },
  {
    full_name: "Eden Mulugeta Berhanu",
    email: "eden.mulugeta" + DEMO_EMAIL_DOMAIN,
    phone_number: "0901234567",
    gender: "Female",
    date_of_birth: "2002-02-28",
    father_name: "Mulugeta Berhanu",
    marital_status: "Single",
    nationality: "Ethiopian",
    blood_type: "A+",
    occupation: "University Student",
    preferred_language: "English",
    emergency_contact_name: "Berhanu Mulugeta",
    emergency_contact_relationship: "Parent",
    emergency_contact_phone: "0911122334",
    medical_history_notes: "No significant surgical history.",
    street_address: "CMC Michael",
    city: "Addis Ababa",
    country: "Ethiopia",
  },
];

const CUSTOM_FIELD_KEYS = [
  "gender",
  "date_of_birth",
  "father_name",
  "grandfather_name",
  "marital_status",
  "nationality",
  "blood_type",
  "occupation",
  "preferred_language",
  "emergency_contact_name",
  "emergency_contact_relationship",
  "emergency_contact_phone",
  "emergency_contact_address",
  "insurance_provider",
  "insurance_policy_number",
  "insurance_group_number",
  "insurance_coverage_type",
  "insurance_policy_holder",
  "allergies",
  "chronic_conditions",
  "current_medications",
  "medical_history_notes",
  "street_address",
  "city",
  "region",
  "postal_code",
  "country",
  "guardian_name",
  "guardian_relationship",
  "guardian_phone",
  "guardian_email",
];

function buildEmergencyContacts(p) {
  if (!p.emergency_contact_name) return [];
  return [
    {
      name: p.emergency_contact_name,
      relationship: p.emergency_contact_relationship || "Other",
      phone: p.emergency_contact_phone || null,
      address: p.emergency_contact_address || null,
    },
  ];
}

function buildInsuranceProfile(p) {
  const profile = {};
  if (p.insurance_provider) profile.provider = p.insurance_provider;
  if (p.insurance_policy_number) profile.policy_number = p.insurance_policy_number;
  if (p.insurance_group_number) profile.group_number = p.insurance_group_number;
  if (p.insurance_coverage_type) profile.coverage_type = p.insurance_coverage_type;
  if (p.insurance_policy_holder) profile.policy_holder = p.insurance_policy_holder;
  return Object.keys(profile).length ? profile : {};
}

function serializeValue(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

async function generatePatientCode(queryInterface, transaction) {
  const prefix = `NC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-`;
  const [latest] = await queryInterface.sequelize.query(
    `SELECT patient_code FROM patient_profiles WHERE patient_code LIKE :prefix ORDER BY patient_code DESC LIMIT 1`,
    { replacements: { prefix: `${prefix}%` }, transaction }
  );
  let seq = 1;
  if (latest.length) {
    const parts = latest[0].patient_code.split("-");
    const n = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

module.exports = {
  async up(queryInterface) {
    assertDemoSeedAllowed("sample-patients");
    await ensurePatientFormCatalog();

    const now = new Date();
    const passwordHash = await bcrypt.hash("password", 10);

    for (const sample of SAMPLE_PATIENTS) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT user_id FROM users WHERE email = :email LIMIT 1`,
        { replacements: { email: sample.email } }
      );
      if (existing.length) continue;

      const userId = uuidv4();
      const profileId = uuidv4();
      const patientCode = await generatePatientCode(queryInterface);
      const codes = assignPatientCodes(patientCode, userId);

      await queryInterface.bulkInsert("users", [
        {
          user_id: userId,
          full_name: sample.full_name,
          email: sample.email,
          password: passwordHash,
          phone_number: sample.phone_number,
          account_type: "PATIENT",
          is_active: true,
          is_first_logged_in: false,
          created_at: now,
          updated_at: now,
        },
      ]);

      await queryInterface.bulkInsert("patient_profiles", [
        {
          patient_profile_id: profileId,
          user_id: userId,
          patient_code: patientCode,
          qr_code: codes.qr_code,
          barcode: codes.barcode,
          date_of_birth: sample.date_of_birth || null,
          gender: sample.gender || null,
          blood_group: sample.blood_type || null,
          marital_status: sample.marital_status || null,
          nationality: sample.nationality || null,
          preferred_language: sample.preferred_language || null,
          emergency_contacts: JSON.stringify(buildEmergencyContacts(sample)),
          insurance_profile: JSON.stringify(buildInsuranceProfile(sample)),
          medical_history_summary:
            sample.medical_history_notes ||
            [sample.chronic_conditions, sample.allergies]
              .filter(Boolean)
              .join("; ") ||
            null,
          patient_status: "active",
          registered_by: ADMIN_USER_ID,
          registered_at: now,
          created_at: now,
          updated_at: now,
        },
      ]);

      for (const key of CUSTOM_FIELD_KEYS) {
        const value = sample[key];
        const serialized = serializeValue(value);
        if (serialized === null) continue;

        await queryInterface.bulkInsert("patient_field_values", [
          {
            id: uuidv4(),
            user_id: userId,
            field_key: key,
            value: serialized,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    const emails = SAMPLE_PATIENTS.map((p) => p.email);
    const [users] = await queryInterface.sequelize.query(
      `SELECT user_id FROM users WHERE email IN (:emails)`,
      { replacements: { emails } }
    );
    const ids = users.map((u) => u.user_id);
    if (!ids.length) return;

    await queryInterface.bulkDelete("patient_field_values", { user_id: ids });
    await queryInterface.bulkDelete("patient_profiles", { user_id: ids });
    await queryInterface.bulkDelete("users", { user_id: ids });
  },
};
