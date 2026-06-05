"use strict";

const OPHTHALMOLOGY_TEMPLATE_TITLE = "Ophthalmology Comprehensive Examination";

const OPHTHALMOLOGY_TEMPLATE_DESCRIPTION =
  "EHR-grade comprehensive ophthalmology examination template showcasing structured eye clinic workflows, ICD-10 coding, canvas annotations, and the full dynamic diagnosis field type catalog.";

const OPHTHALMOLOGY_DIAGRAM_CATEGORIES = [
  { name: "Anterior Segment", code: "anterior_segment", sort_order: 10 },
  { name: "Fundus Retina", code: "fundus_retina", sort_order: 20 },
  { name: "Optic Disc", code: "optic_disc", sort_order: 30 },
  { name: "Cornea", code: "cornea", sort_order: 40 },
  { name: "Glaucoma Findings", code: "glaucoma_findings", sort_order: 50 },
  { name: "Diabetic Retinopathy", code: "diabetic_retinopathy", sort_order: 60 },
  { name: "Macular Degeneration", code: "macular_degeneration", sort_order: 70 },
  { name: "Retinal Detachment", code: "retinal_detachment", sort_order: 80 },
  { name: "Cataract", code: "cataract", sort_order: 90 },
  { name: "Pterygium", code: "pterygium", sort_order: 100 },
];

const OPHTHALMOLOGY_DIAGRAMS = [
  {
    code: "oph_anterior_segment",
    name: "Anterior Segment Diagram",
    categoryCode: "anterior_segment",
  },
  {
    code: "oph_fundus_retina",
    name: "Fundus Retina Diagram",
    categoryCode: "fundus_retina",
  },
  {
    code: "oph_optic_disc",
    name: "Optic Disc Diagram",
    categoryCode: "optic_disc",
  },
  { code: "oph_cornea", name: "Cornea Diagram", categoryCode: "cornea" },
  {
    code: "oph_glaucoma",
    name: "Glaucoma Findings Map",
    categoryCode: "glaucoma_findings",
  },
  {
    code: "oph_diabetic_retinopathy",
    name: "Diabetic Retinopathy Map",
    categoryCode: "diabetic_retinopathy",
  },
  {
    code: "oph_macular_degeneration",
    name: "Macular Degeneration Map",
    categoryCode: "macular_degeneration",
  },
  {
    code: "oph_retinal_detachment",
    name: "Retinal Detachment Map",
    categoryCode: "retinal_detachment",
  },
  { code: "oph_cataract", name: "Cataract Mapping Diagram", categoryCode: "cataract" },
  { code: "oph_pterygium", name: "Pterygium Diagram", categoryCode: "pterygium" },
];

const VA_OPTIONS = [
  "6/6",
  "6/9",
  "6/12",
  "6/18",
  "6/24",
  "6/36",
  "6/60",
  "CF",
  "HM",
  "PL",
  "NPL",
];

const LATERALITY_OPTIONS = ["Right Eye (OD)", "Left Eye (OS)", "Both Eyes (OU)"];

const COMPLAINT_OPTIONS = [
  "Blurred Vision",
  "Eye Pain",
  "Red Eye",
  "Itching",
  "Foreign Body Sensation",
  "Photophobia",
  "Diplopia",
  "Dry Eye",
  "Watering Eye",
  "Loss of Vision",
  "Floaters",
  "Flashes",
  "Headache Associated with Vision",
];

const EXTERNAL_FINDINGS = [
  "Normal",
  "Inflamed",
  "Scarred",
  "Edematous",
  "Opaque",
  "Injected",
  "Pterygium Present",
  "Cataract Present",
];

const FUNDUS_FINDINGS = [
  "Normal",
  "Glaucomatous Changes",
  "Diabetic Retinopathy",
  "Hypertensive Retinopathy",
  "Macular Degeneration",
  "Retinal Detachment",
];

const IOP_METHODS = [
  "Goldmann Applanation",
  "Non-contact Tonometry",
  "Perkins",
  "iCare",
  "Other",
];

const ICD10_OPTIONS = [
  "H25.9 - Age-related Cataract",
  "H40.9 - Glaucoma",
  "H10.9 - Conjunctivitis",
  "H04.1 - Dry Eye Syndrome",
  "H35.3 - Macular Degeneration",
  "H33.2 - Retinal Detachment",
  "E11.3 - Diabetic Retinopathy",
  "H52.1 - Myopia",
  "H52.0 - Hypermetropia",
  "H52.2 - Astigmatism",
  "H35.0 - Background Retinopathy",
  "H40.1 - Primary Open-angle Glaucoma",
  "H25.1 - Senile Nuclear Cataract",
  "H16.9 - Keratitis",
  "H43.3 - Vitreous Floaters",
];

const RATING_OPTIONS = ["1 - Minimal", "2", "3", "4", "5 - Severe"];

const buildOphthalmologyGroups = () => [
  {
    title: "Patient & Visit Intake",
    description: "Demographics, visit metadata, and intake identifiers.",
    sort_order: 0,
  },
  {
    title: "Patient Visual Complaints",
    description: "Chief complaint, symptom profile, and laterality.",
    sort_order: 1,
  },
  {
    title: "Visual Acuity",
    description: "Distance and near vision for each eye.",
    sort_order: 2,
  },
  {
    title: "Refraction",
    description: "Sphere, cylinder, axis, and add for each eye.",
    sort_order: 3,
  },
  {
    title: "Intraocular Pressure (IOP)",
    description: "Tonometry readings and measurement method.",
    sort_order: 4,
  },
  {
    title: "External Examination",
    description: "Anterior segment external structures.",
    sort_order: 5,
  },
  {
    title: "Pupillary Assessment",
    description: "Pupil size, shape, and reflexes.",
    sort_order: 6,
  },
  {
    title: "Ocular Motility",
    description: "Extraocular movements and alignment.",
    sort_order: 7,
  },
  {
    title: "Fundus Examination",
    description: "Posterior segment findings.",
    sort_order: 8,
  },
  {
    title: "Ophthalmology Canvas Annotations",
    description:
      "Image annotation for retina, cornea, optic disc, and specialty maps.",
    sort_order: 9,
  },
  {
    title: "ICD-10 Diagnosis Selection",
    description: "Searchable-coded diagnosis picker (multi-select).",
    sort_order: 10,
  },
  {
    title: "Assessment & Clinical Impression",
    description: "Primary and secondary diagnoses with clinical reasoning.",
    sort_order: 11,
  },
  {
    title: "Treatment Plan",
    description: "Medications, investigations, procedures, and follow-up.",
    sort_order: 12,
  },
  {
    title: "Cataract Assessment",
    description:
      "Complete when cataract is present (conditional workflow demonstration).",
    sort_order: 13,
  },
  {
    title: "Diabetic Retinopathy Workup",
    description:
      "Complete when diabetes risk factor is selected (conditional workflow demonstration).",
    sort_order: 14,
  },
  {
    title: "Surgical Planning",
    description:
      "Complete when surgery is required (conditional workflow demonstration).",
    sort_order: 15,
  },
  {
    title: "Medications & Procedures Registry",
    description: "Repeatable-style medication and procedure rows.",
    sort_order: 16,
  },
  {
    title: "Attachments & Diagnostic Imaging",
    description: "Clinical files, OCT, visual fields, and eye photos.",
    sort_order: 17,
  },
  {
    title: "Clinical Summary",
    description: "Editable consolidated summary for documentation.",
    sort_order: 18,
  },
];

/** @param {string} section */
function field(section, field_key, label, field_type, sort_order, config = {}, is_required = false) {
  const scopedKey = field_key.startsWith("oph_") ? field_key : `oph_${field_key}`;
  return {
    section,
    field_key: scopedKey,
    label,
    field_type,
    sort_order,
    config,
    is_required,
  };
}

function buildOphthalmologyFields() {
  const S = {
    INTAKE: "Patient & Visit Intake",
    COMPLAINTS: "Patient Visual Complaints",
    VA: "Visual Acuity",
    REFRACTION: "Refraction",
    IOP: "Intraocular Pressure (IOP)",
    EXTERNAL: "External Examination",
    PUPIL: "Pupillary Assessment",
    MOTILITY: "Ocular Motility",
    FUNDUS: "Fundus Examination",
    CANVAS: "Ophthalmology Canvas Annotations",
    ICD: "ICD-10 Diagnosis Selection",
    ASSESSMENT: "Assessment & Clinical Impression",
    PLAN: "Treatment Plan",
    CATARACT: "Cataract Assessment",
    DIABETIC: "Diabetic Retinopathy Workup",
    SURGERY: "Surgical Planning",
    MEDS: "Medications & Procedures Registry",
    ATTACH: "Attachments & Diagnostic Imaging",
    SUMMARY: "Clinical Summary",
  };

  const suggestion = (category) => ({
    clinical_suggestions: true,
    suggestion_category: category,
  });

  return [
    // —— Patient & Visit Intake (showcase: input, select, radio, date, time, number, switch) ——
    field(S.INTAKE, "visit_date", "Visit date", "date", 0, {}, true),
    field(S.INTAKE, "examination_time", "Examination time", "time", 1),
    field(S.INTAKE, "consultation_date", "Consultation date (timestamp date)", "date", 2),
    field(S.INTAKE, "consultation_time", "Consultation time (timestamp time)", "time", 3),
    field(S.INTAKE, "visit_type", "Visit type", "select", 4, {
      options: ["New Patient", "Follow-up", "Emergency", "Post-operative", "Screening"],
    }),
    field(S.INTAKE, "patient_age", "Patient age", "number", 5, { placeholder: "Years" }),
    field(S.INTAKE, "patient_gender", "Gender", "radio", 6, {
      options: ["Male", "Female", "Other"],
    }),
    field(S.INTAKE, "occupation", "Occupation", "input", 7, {
      placeholder: "e.g. Teacher, Driver",
    }),
    field(S.INTAKE, "referring_physician", "Referring physician", "input", 8),
    field(S.INTAKE, "external_referral_number", "External referral number", "input", 9),
    field(S.INTAKE, "eyeglasses_rx_number", "Eye glasses prescription number", "input", 10),
    field(S.INTAKE, "family_eye_disease_history", "Family eye disease history", "input", 11, {
      placeholder: "e.g. Glaucoma in father",
    }),
    field(S.INTAKE, "emergency_case", "Emergency case", "switch", 12),
    field(S.INTAKE, "vision_threatening", "Vision threatening presentation", "switch", 13),
    field(S.INTAKE, "follow_up_required", "Follow-up required", "switch", 14),

    // —— Visual Complaints (textarea, checkbox, select, number as severity slider demo) ——
    field(S.COMPLAINTS, "chief_complaint", "Chief complaint", "textarea", 0, {
      ...suggestion("general"),
      placeholder: "Describe the primary visual complaint in the patient's own words…",
    }, true),
    field(S.COMPLAINTS, "history_present_illness", "History of present illness", "textarea", 1, {
      ...suggestion("general"),
      placeholder: "Onset, progression, associated symptoms…",
    }),
    field(S.COMPLAINTS, "symptom_duration", "Duration", "input", 2, {
      placeholder: "e.g. 2 weeks, 3 days",
    }),
    field(S.COMPLAINTS, "laterality", "Laterality", "select", 3, {
      options: LATERALITY_OPTIONS,
    }, true),
    field(S.COMPLAINTS, "symptom_checklist", "Symptoms", "checkbox", 4, {
      options: COMPLAINT_OPTIONS,
      max_selected: 12,
    }),
    field(S.COMPLAINTS, "symptom_start_date", "Symptom start date", "date", 5),
    field(S.COMPLAINTS, "pain_score", "Pain score (0–10 slider demo)", "number", 6, {
      placeholder: "0–10",
      description: "Enter pain severity from 0 (none) to 10 (worst).",
    }),
    field(S.COMPLAINTS, "visual_disturbance_severity", "Visual disturbance severity (0–100)", "number", 7, {
      placeholder: "0–100",
      description: "Percentage severity of visual disturbance.",
    }),
    field(S.COMPLAINTS, "symptom_severity_rating", "Symptom severity (rating demo)", "select", 8, {
      options: RATING_OPTIONS,
    }),
    field(S.COMPLAINTS, "patient_vision_quality", "Patient vision quality (1–5)", "select", 9, {
      options: RATING_OPTIONS,
    }),
    field(S.COMPLAINTS, "vision_status", "Vision status", "radio", 10, {
      options: ["Normal", "Impaired", "Severely Impaired"],
    }),
    field(S.COMPLAINTS, "risk_factors", "Risk factors", "checkbox", 11, {
      options: [
        "Diabetes",
        "Hypertension",
        "Smoking",
        "Family History",
        "Trauma",
        "Steroid Use",
      ],
    }),
    field(S.COMPLAINTS, "diabetes_risk_flag", "Diabetes (risk factor flag)", "switch", 12, {
      description: "When enabled, complete the Diabetic Retinopathy Workup section.",
    }),
    field(S.COMPLAINTS, "cataract_suspected", "Cataract suspected", "switch", 13, {
      description: "When enabled, complete the Cataract Assessment section.",
    }),

    // —— Visual Acuity ——
    field(S.VA, "od_unaided_distance", "OD — Unaided distance vision", "select", 0, {
      options: VA_OPTIONS,
      placeholder: "Select acuity",
    }),
    field(S.VA, "od_corrected_distance", "OD — Corrected distance vision", "select", 1, {
      options: VA_OPTIONS,
    }),
    field(S.VA, "od_near_vision", "OD — Near vision", "select", 2, {
      options: VA_OPTIONS,
    }),
    field(S.VA, "os_unaided_distance", "OS — Unaided distance vision", "select", 3, {
      options: VA_OPTIONS,
    }),
    field(S.VA, "os_corrected_distance", "OS — Corrected distance vision", "select", 4, {
      options: VA_OPTIONS,
    }),
    field(S.VA, "os_near_vision", "OS — Near vision", "select", 5, {
      options: VA_OPTIONS,
    }),
    field(S.VA, "visual_acuity_score", "Visual acuity score (numeric)", "number", 6, {
      placeholder: "LogMAR or numeric score",
    }),
    field(S.VA, "additional_va_notes", "Additional visual acuity notes", "textarea", 7),

    // —— Refraction ——
    field(S.REFRACTION, "od_sphere", "OD — Sphere", "input", 0, { placeholder: "e.g. -2.00" }),
    field(S.REFRACTION, "od_cylinder", "OD — Cylinder", "input", 1, { placeholder: "e.g. -0.75" }),
    field(S.REFRACTION, "od_axis", "OD — Axis", "number", 2, { placeholder: "0–180" }),
    field(S.REFRACTION, "od_add", "OD — Add", "input", 3, { placeholder: "e.g. +2.00" }),
    field(S.REFRACTION, "os_sphere", "OS — Sphere", "input", 4),
    field(S.REFRACTION, "os_cylinder", "OS — Cylinder", "input", 5),
    field(S.REFRACTION, "os_axis", "OS — Axis", "number", 6),
    field(S.REFRACTION, "os_add", "OS — Add", "input", 7),
    field(S.REFRACTION, "refraction_notes", "Refraction notes", "textarea", 8),

    // —— IOP ——
    field(S.IOP, "od_iop", "Right eye IOP (mmHg)", "number", 0, { placeholder: "mmHg" }),
    field(S.IOP, "os_iop", "Left eye IOP (mmHg)", "number", 1, { placeholder: "mmHg" }),
    field(S.IOP, "iop_measurement_method", "Measurement method", "select", 2, {
      options: IOP_METHODS,
    }),
    field(S.IOP, "iop_notes", "IOP notes", "textarea", 3),

    // —— External Examination ——
    field(S.EXTERNAL, "lids_findings", "Lids", "select", 0, { options: EXTERNAL_FINDINGS }),
    field(S.EXTERNAL, "lids_notes", "Lids — free text", "input", 1, {
      placeholder: "Additional lid findings",
    }),
    field(S.EXTERNAL, "lashes_findings", "Lashes", "select", 2, { options: EXTERNAL_FINDINGS }),
    field(S.EXTERNAL, "conjunctiva_findings", "Conjunctiva", "select", 3, {
      options: EXTERNAL_FINDINGS,
    }),
    field(S.EXTERNAL, "cornea_findings", "Cornea", "select", 4, { options: EXTERNAL_FINDINGS }),
    field(S.EXTERNAL, "anterior_chamber", "Anterior chamber", "select", 5, {
      options: ["Normal", "Shallow", "Deep", "Cells", "Flare", "Hyphema"],
    }),
    field(S.EXTERNAL, "iris_findings", "Iris", "select", 6, { options: EXTERNAL_FINDINGS }),
    field(S.EXTERNAL, "lens_findings", "Lens", "select", 7, { options: EXTERNAL_FINDINGS }),
    field(S.EXTERNAL, "external_exam_notes", "External examination notes", "textarea", 8),

    // —— Pupillary Assessment ——
    field(S.PUPIL, "pupil_size", "Pupil size", "input", 0, { placeholder: "e.g. 3 mm" }),
    field(S.PUPIL, "pupil_shape", "Pupil shape", "select", 1, {
      options: ["Round", "Irregular", "Peaked", "Fixed"],
    }),
    field(S.PUPIL, "direct_reflex", "Direct reflex", "radio", 2, {
      options: ["Normal", "Abnormal", "Absent"],
    }),
    field(S.PUPIL, "consensual_reflex", "Consensual reflex", "radio", 3, {
      options: ["Normal", "Abnormal", "Absent"],
    }),
    field(S.PUPIL, "rapd", "RAPD", "radio", 4, {
      options: ["Positive", "Negative", "Not tested"],
    }),
    field(S.PUPIL, "pupil_notes", "Pupillary assessment notes", "textarea", 5),

    // —— Ocular Motility ——
    field(S.MOTILITY, "extraocular_movements", "Extraocular movements", "select", 0, {
      options: ["Normal", "Restricted", "Painful", "Not tested"],
    }),
    field(S.MOTILITY, "strabismus", "Strabismus", "radio", 1, {
      options: ["Present", "Absent"],
    }),
    field(S.MOTILITY, "nystagmus", "Nystagmus", "radio", 2, {
      options: ["Present", "Absent"],
    }),
    field(S.MOTILITY, "motility_notes", "Ocular motility notes", "textarea", 3),

    // —— Fundus Examination ——
    field(S.FUNDUS, "optic_disc", "Optic disc", "select", 0, { options: FUNDUS_FINDINGS }),
    field(S.FUNDUS, "cup_disc_ratio", "Cup disc ratio", "number", 1, {
      placeholder: "e.g. 0.3",
      description: "Decimal C/D ratio (0.0–1.0).",
    }),
    field(S.FUNDUS, "macula", "Macula", "select", 2, { options: FUNDUS_FINDINGS }),
    field(S.FUNDUS, "retina", "Retina", "select", 3, { options: FUNDUS_FINDINGS }),
    field(S.FUNDUS, "vessels", "Vessels", "select", 4, {
      options: ["Normal", "Attenuated", "Tortuous", "Neovascularization", "Hemorrhages"],
    }),
    field(S.FUNDUS, "peripheral_retina", "Peripheral retina", "select", 5, {
      options: FUNDUS_FINDINGS,
    }),
    field(S.FUNDUS, "fundus_notes", "Fundus examination notes", "textarea", 6),

    // —— Canvas annotations ——
    field(S.CANVAS, "retina_annotation", "Retina annotation", "canvas_annotation", 0, {
      canvas_source_type: "library",
      diagram_code: "oph_fundus_retina",
      description: "Annotate fundus retina findings (drawing, labels, arrows).",
    }),
    field(S.CANVAS, "cornea_annotation", "Cornea annotation", "canvas_annotation", 1, {
      canvas_source_type: "library",
      diagram_code: "oph_cornea",
      description: "Annotate corneal findings and defects.",
    }),
    field(S.CANVAS, "optic_disc_annotation", "Optic disc annotation", "canvas_annotation", 2, {
      canvas_source_type: "library",
      diagram_code: "oph_optic_disc",
      description: "Mark optic disc cupping, pallor, or hemorrhages.",
    }),
    field(S.CANVAS, "cataract_mapping", "Cataract mapping", "canvas_annotation", 3, {
      canvas_source_type: "library",
      diagram_code: "oph_cataract",
      description: "Map cataract location and density.",
    }),
    field(S.CANVAS, "retinal_detachment_mapping", "Retinal detachment mapping", "canvas_annotation", 4, {
      canvas_source_type: "library",
      diagram_code: "oph_retinal_detachment",
      description: "Outline retinal breaks and detachment zones.",
    }),
    field(S.CANVAS, "anterior_segment_annotation", "Anterior segment annotation", "canvas_annotation", 5, {
      canvas_source_type: "library",
      diagram_code: "oph_anterior_segment",
    }),
    field(S.CANVAS, "custom_ophthalmology_upload", "Custom ophthalmology image (upload)", "canvas_annotation", 6, {
      canvas_source_type: "custom",
      description: "Upload a custom anterior segment or fundus image for annotation.",
    }),

    // —— ICD-10 ——
    field(S.ICD, "icd10_diagnoses", "ICD-10 diagnoses", "select", 0, {
      options: ICD10_OPTIONS,
      multiple: true,
      placeholder: "Select one or more ICD-10 codes",
    }, true),
    field(S.ICD, "primary_icd10_code", "Primary ICD-10 code", "input", 1, {
      placeholder: "e.g. H25.9",
    }),
    field(S.ICD, "primary_diagnosis_name", "Primary diagnosis name", "input", 2, {
      placeholder: "e.g. Age-related cataract",
    }),
    field(S.ICD, "secondary_icd10_codes", "Secondary ICD-10 codes", "textarea", 3, {
      placeholder: "Additional ICD-10 codes and names",
    }),

    // —— Assessment ——
    field(S.ASSESSMENT, "primary_diagnosis", "Primary diagnosis", "textarea", 0, {
      ...suggestion("diagnosis"),
    }, true),
    field(S.ASSESSMENT, "secondary_diagnosis", "Secondary diagnosis", "textarea", 1, {
      ...suggestion("diagnosis"),
    }),
    field(S.ASSESSMENT, "clinical_impression", "Clinical impression", "textarea", 2, {
      ...suggestion("assessment"),
    }),
    field(S.ASSESSMENT, "assessment_notes", "Assessment notes", "textarea", 3, {
      ...suggestion("assessment"),
    }),
    field(S.ASSESSMENT, "chronic_disease", "Chronic disease", "switch", 4),
    field(S.ASSESSMENT, "requires_referral", "Requires referral", "switch", 5),

    // —— Treatment Plan ——
    field(S.PLAN, "medications_plan", "Medications", "textarea", 0, {
      ...suggestion("prescription"),
      placeholder: "Prescribed ophthalmic and systemic medications…",
    }),
    field(S.PLAN, "investigations_plan", "Investigations", "textarea", 1, {
      ...suggestion("plan"),
      placeholder: "OCT, visual fields, B-scan, labs…",
    }),
    field(S.PLAN, "procedures_plan", "Procedures", "textarea", 2, {
      ...suggestion("procedure"),
    }),
    field(S.PLAN, "follow_up_plan", "Follow-up plan", "textarea", 3, {
      ...suggestion("plan"),
    }),
    field(S.PLAN, "follow_up_days", "Follow-up in (days)", "number", 4, { placeholder: "Days" }),
    field(S.PLAN, "follow_up_date", "Follow-up date", "date", 5),
    field(S.PLAN, "follow_up_time", "Follow-up time", "time", 6),
    field(S.PLAN, "referral_recommendation", "Referral recommendation", "textarea", 7, {
      ...suggestion("referral"),
    }),
    field(S.PLAN, "requires_surgery", "Requires surgery", "switch", 8, {
      description: "When enabled, complete the Surgical Planning section.",
    }),

    // —— Cataract Assessment (conditional demo) ——
    field(S.CATARACT, "cataract_present", "Cataract present", "switch", 0),
    field(S.CATARACT, "cataract_type", "Cataract type", "select", 1, {
      options: [
        "Nuclear",
        "Cortical",
        "Posterior subcapsular",
        "Mixed",
        "Congenital",
        "Traumatic",
      ],
    }),
    field(S.CATARACT, "cataract_grade", "Cataract grade", "select", 2, {
      options: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Mature"],
    }),
    field(S.CATARACT, "surgery_recommendation", "Surgery recommendation", "textarea", 3, {
      ...suggestion("procedure"),
    }),

    // —— Diabetic Retinopathy Workup (conditional demo) ——
    field(S.DIABETIC, "diabetic_retinopathy_grade", "Diabetic retinopathy grade", "select", 0, {
      options: [
        "No DR",
        "Mild NPDR",
        "Moderate NPDR",
        "Severe NPDR",
        "PDR",
        "Proliferative with DME",
      ],
    }),
    field(S.DIABETIC, "diabetic_retina_findings", "Diabetic retina findings", "textarea", 1, {
      ...suggestion("assessment"),
    }),
    field(S.DIABETIC, "dme_present", "Diabetic macular edema (DME)", "switch", 2),

    // —— Surgical Planning (conditional demo) ——
    field(S.SURGERY, "surgical_recommendation", "Surgical recommendation", "textarea", 0, {
      ...suggestion("procedure"),
    }),
    field(S.SURGERY, "procedure_priority", "Procedure priority", "select", 1, {
      options: ["Routine", "Urgent", "Emergency"],
    }),
    field(S.SURGERY, "estimated_surgery_date", "Estimated surgery date", "date", 2),
    field(S.SURGERY, "procedure_timestamp_date", "Procedure date", "date", 3),
    field(S.SURGERY, "procedure_timestamp_time", "Procedure time", "time", 4),

    // —— Medications & Procedures (repeater-style rows) ——
    field(S.MEDS, "medication_1_drug", "Medication 1 — Drug", "input", 0),
    field(S.MEDS, "medication_1_dose", "Medication 1 — Dose", "input", 1),
    field(S.MEDS, "medication_1_frequency", "Medication 1 — Frequency", "input", 2),
    field(S.MEDS, "medication_1_duration", "Medication 1 — Duration", "input", 3),
    field(S.MEDS, "medication_2_drug", "Medication 2 — Drug", "input", 4),
    field(S.MEDS, "medication_2_dose", "Medication 2 — Dose", "input", 5),
    field(S.MEDS, "medication_2_frequency", "Medication 2 — Frequency", "input", 6),
    field(S.MEDS, "medication_2_duration", "Medication 2 — Duration", "input", 7),
    field(S.MEDS, "procedure_1_name", "Procedure 1 — Name", "input", 8),
    field(S.MEDS, "procedure_1_date", "Procedure 1 — Date", "date", 9),
    field(S.MEDS, "procedure_1_outcome", "Procedure 1 — Outcome", "input", 10),
    field(S.MEDS, "procedure_2_name", "Procedure 2 — Name", "input", 11),
    field(S.MEDS, "procedure_2_date", "Procedure 2 — Date", "date", 12),
    field(S.MEDS, "procedure_2_outcome", "Procedure 2 — Outcome", "input", 13),
    field(S.MEDS, "surgery_history_1_procedure", "Previous surgery 1 — Procedure", "input", 14),
    field(S.MEDS, "surgery_history_1_eye", "Previous surgery 1 — Eye", "select", 15, {
      options: LATERALITY_OPTIONS,
    }),
    field(S.MEDS, "surgery_history_1_date", "Previous surgery 1 — Date", "date", 16),
    field(S.MEDS, "surgery_history_1_hospital", "Previous surgery 1 — Hospital", "input", 17),
    field(S.MEDS, "surgery_history_2_procedure", "Previous surgery 2 — Procedure", "input", 18),
    field(S.MEDS, "surgery_history_2_eye", "Previous surgery 2 — Eye", "select", 19, {
      options: LATERALITY_OPTIONS,
    }),
    field(S.MEDS, "surgery_history_2_date", "Previous surgery 2 — Date", "date", 20),
    field(S.MEDS, "previous_surgery_date", "Most recent previous surgery date", "date", 21),

    // —— Attachments ——
    field(S.ATTACH, "clinical_attachments", "Clinical attachments", "file", 0, {
      multiple: true,
      allowed_types: ["pdf", "jpg", "jpeg", "png", "doc", "docx"],
      max_size_mb: 15,
    }),
    field(S.ATTACH, "retina_scan", "Retina scan", "file", 1, {
      allowed_types: ["jpg", "jpeg", "png", "pdf", "dcm"],
    }),
    field(S.ATTACH, "fundus_image", "Fundus image", "file", 2, {
      allowed_types: ["jpg", "jpeg", "png"],
    }),
    field(S.ATTACH, "oct_report", "OCT report", "file", 3, {
      allowed_types: ["pdf", "jpg", "jpeg", "png"],
    }),
    field(S.ATTACH, "visual_field_report", "Visual field report", "file", 4, {
      allowed_types: ["pdf", "jpg", "jpeg", "png"],
    }),
    field(S.ATTACH, "external_referral_documents", "External referral documents", "file", 5, {
      multiple: true,
      allowed_types: ["pdf", "jpg", "jpeg", "png"],
    }),
    field(S.ATTACH, "patient_eye_photos", "Patient eye photos (image upload demo)", "file", 6, {
      multiple: true,
      allowed_types: ["jpg", "jpeg", "png", "webp"],
    }),
    field(S.ATTACH, "corneal_images", "Corneal images", "file", 7, {
      multiple: true,
      allowed_types: ["jpg", "jpeg", "png"],
    }),
    field(S.ATTACH, "anterior_segment_photos", "Anterior segment photos", "file", 8, {
      multiple: true,
      allowed_types: ["jpg", "jpeg", "png"],
    }),

    // —— Clinical Summary + rich text ——
    field(S.SUMMARY, "clinical_notes_richtext", "Clinical notes (rich text)", "richtext", 0, {
      description: "Formatted clinical notes with lists and emphasis.",
    }),
    field(S.SUMMARY, "additional_findings", "Additional findings", "textarea", 1, {
      ...suggestion("general"),
    }),
    field(
      S.SUMMARY,
      "clinical_summary",
      "Clinical summary (editable)",
      "textarea",
      2,
      {
        ...suggestion("assessment"),
        placeholder:
          "Patient presents with decreased visual acuity in the right eye.\nFundus examination reveals diabetic retinopathy changes.\nIOP within normal range.\nAssessment consistent with diabetic retinopathy.",
        description:
          "Consolidated summary — edit before saving. Combine major findings from this examination.",
      },
      true
    ),
  ];
}

module.exports = {
  OPHTHALMOLOGY_TEMPLATE_TITLE,
  OPHTHALMOLOGY_TEMPLATE_DESCRIPTION,
  OPHTHALMOLOGY_DIAGRAM_CATEGORIES,
  OPHTHALMOLOGY_DIAGRAMS,
  buildOphthalmologyGroups,
  buildOphthalmologyFields,
};
