"use strict";

function normalizeFieldRecord(field) {
  const plain = field?.toJSON ? field.toJSON() : field;
  if (!plain) return null;

  const config = plain.config || {};
  if (!config.options && Array.isArray(plain.options)) {
    config.options = plain.options;
  }

  if (plain.group?.title) {
    plain.category = plain.group.title;
  }

  return { ...plain, config };
}

module.exports = { normalizeFieldRecord };
