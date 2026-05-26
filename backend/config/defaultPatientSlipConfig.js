"use strict";

/** Default patient identification slip layout (matches original hardcoded slip). */
const DEFAULT_PATIENT_SLIP_CONFIG = {
  header: {
    use_branding_logo: true,
    logo_url: null,
    use_branding_title: true,
    title_am: null,
    title_en: null,
    logo_width_px: 72,
    logo_height_px: 72,
  },
  decor: {
    top: {
      enabled: true,
      image_url: "/top-bar.png",
      height_px: 32,
      object_fit: "cover",
      object_position: "center",
    },
    bottom: {
      enabled: true,
      image_url: "/bottom-bar.png",
      height_px: 32,
      object_fit: "cover",
      object_position: "center",
    },
  },
  barcode_field_key: "@barcode",
  layout: "columns",
  left_columns: [
    {
      id: "reg",
      label_am: "የምዝገባ ቁጥር",
      label_en: "Registration No.",
      field_key: "@patient_code",
      enabled: true,
    },
    {
      id: "name",
      label_am: "ሙሉ ስም",
      label_en: "Full Name",
      field_key: "@full_name",
      enabled: true,
    },
    {
      id: "pob",
      label_am: "የትውልድ ቦታ",
      label_en: "Place of Birth",
      field_key: "@place_of_birth",
      enabled: true,
    },
    {
      id: "dob",
      label_am: "የትውልድ ቀን",
      label_en: "Date of Birth",
      field_key: "date_of_birth",
      enabled: true,
    },
    {
      id: "sex",
      label_am: "ጾታ",
      label_en: "Sex",
      field_key: "gender",
      enabled: true,
    },
    {
      id: "subcity",
      label_am: "ክፍለ ከተማ",
      label_en: "Sub City",
      field_key: "city",
      enabled: true,
    },
    {
      id: "woreda",
      label_am: "ወረዳ",
      label_en: "Woreda",
      field_key: "postal_code",
      enabled: true,
    },
    {
      id: "house",
      label_am: "የቤት ቁጥር",
      label_en: "House No.",
      field_key: "street_address",
      enabled: true,
    },
    {
      id: "phone",
      label_am: "ስልክ ቁጥር",
      label_en: "Phone No.",
      field_key: "@phone",
      enabled: true,
    },
  ],
  right_columns: [
    {
      id: "name_r",
      label_am: "ሙሉ ስም",
      label_en: "Full Name",
      field_key: "@full_name",
      enabled: true,
    },
    {
      id: "pob_r",
      label_am: "የትውልድ ቦታ",
      label_en: "Place of Birth",
      field_key: "@place_of_birth",
      enabled: true,
    },
    {
      id: "dob_r",
      label_am: "የትውልድ ቀን",
      label_en: "Date of Birth",
      field_key: "date_of_birth",
      enabled: true,
    },
    {
      id: "sex_r",
      label_am: "ጾታ",
      label_en: "Sex",
      field_key: "gender",
      enabled: true,
    },
    {
      id: "subcity_r",
      label_am: "ክፍለ ከተማ",
      label_en: "Sub City",
      field_key: "city",
      enabled: true,
    },
    {
      id: "woreda_r",
      label_am: "ወረዳ",
      label_en: "Woreda",
      field_key: "postal_code",
      enabled: true,
    },
  ],
};

const RESERVED_FIELD_KEYS = [
  { key: "@patient_code", label: "Patient registration code" },
  { key: "@barcode", label: "Barcode (or patient code)" },
  { key: "@full_name", label: "Full name" },
  { key: "@email", label: "Email" },
  { key: "@phone", label: "Phone number" },
  { key: "@place_of_birth", label: "Place of birth (city, region, country)" },
];

function mergeSlipConfig(stored) {
  if (!stored || typeof stored !== "object") {
    return JSON.parse(JSON.stringify(DEFAULT_PATIENT_SLIP_CONFIG));
  }

  const base = JSON.parse(JSON.stringify(DEFAULT_PATIENT_SLIP_CONFIG));

  return {
    header: { ...base.header, ...(stored.header || {}) },
    decor: {
      top: { ...base.decor.top, ...(stored.decor?.top || {}) },
      bottom: { ...base.decor.bottom, ...(stored.decor?.bottom || {}) },
    },
    barcode_field_key:
      stored.barcode_field_key !== undefined
        ? stored.barcode_field_key
        : base.barcode_field_key,
    layout:
      stored.layout === "rows" || stored.layout === "columns"
        ? stored.layout
        : base.layout,
    left_columns:
      Array.isArray(stored.left_columns) && stored.left_columns.length
        ? stored.left_columns
        : base.left_columns,
    right_columns:
      Array.isArray(stored.right_columns) && stored.right_columns.length
        ? stored.right_columns
        : base.right_columns,
  };
}

module.exports = {
  DEFAULT_PATIENT_SLIP_CONFIG,
  RESERVED_FIELD_KEYS,
  mergeSlipConfig,
};
