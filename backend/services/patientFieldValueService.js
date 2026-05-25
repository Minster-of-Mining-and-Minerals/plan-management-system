"use strict";

const { PatientFieldValue } = require("../models");
const {
  parseStoredValue,
  serializeValueForStorage,
} = require("./dynamicUserValidationService");

async function getCustomValuesMap(userId, fields = []) {
  const rows = await PatientFieldValue.findAll({ where: { user_id: userId } });
  const fieldByKey = new Map(fields.map((f) => [f.field_key, f]));
  const custom_fields = {};

  for (const row of rows) {
    const field = fieldByKey.get(row.field_key);
    custom_fields[row.field_key] = field
      ? parseStoredValue(row.value, field)
      : row.value;
  }

  return custom_fields;
}

async function savePatientFieldValues(userId, customValues, fields, transaction) {
  if (!customValues || typeof customValues !== "object") return;

  const fieldByKey = new Map(fields.map((f) => [f.field_key, f]));

  for (const [fieldKey, raw] of Object.entries(customValues)) {
    const field = fieldByKey.get(fieldKey);
    const serialized = field
      ? serializeValueForStorage(raw, field)
      : raw == null
        ? null
        : typeof raw === "object"
          ? JSON.stringify(raw)
          : String(raw);

    const existing = await PatientFieldValue.findOne({
      where: { user_id: userId, field_key: fieldKey },
      transaction,
    });

    if (existing) {
      await existing.update(
        { value: serialized, updated_at: new Date() },
        { transaction }
      );
    } else {
      await PatientFieldValue.create(
        { user_id: userId, field_key: fieldKey, value: serialized },
        { transaction }
      );
    }
  }
}

function enrichPatientResponse(user, profile, custom_fields = {}) {
  const plain = user?.toJSON ? user.toJSON() : { ...user };
  const profilePlain = profile?.toJSON ? profile.toJSON() : profile;
  return {
    ...plain,
    profile: profilePlain,
    custom_fields,
  };
}

module.exports = {
  getCustomValuesMap,
  savePatientFieldValues,
  enrichPatientResponse,
};
