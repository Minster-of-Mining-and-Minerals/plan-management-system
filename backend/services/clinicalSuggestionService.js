"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const {
  CLINICAL_SUGGESTION_CATEGORIES,
  DEFAULT_CLINICAL_PHRASES,
} = require("../config/clinicalSuggestionConstants");

const format = (row) => row.get({ plain: true });

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function scoreSuggestion(row, query, userUsageCount = 0) {
  const text = row.text.toLowerCase();
  const q = query.toLowerCase().trim();
  let matchScore = 0;

  if (!q) matchScore = 10;
  else if (text.startsWith(q)) matchScore = 100;
  else if (text.includes(q)) matchScore = 60;
  else {
    const words = q.split(/\s+/).filter(Boolean);
    const wordHits = words.filter((w) => text.includes(w)).length;
    if (wordHits) matchScore = 30 + wordHits * 10;
    else {
      const firstWord = text.split(/\s+/)[0] || text;
      const dist = levenshtein(firstWord.slice(0, Math.min(firstWord.length, q.length + 2)), q);
      if (dist <= 2) matchScore = 25;
    }
  }

  const recencyBoost = row.last_used_at
    ? Math.max(0, 20 - Math.floor((Date.now() - new Date(row.last_used_at).getTime()) / 86400000))
    : 0;

  return (
    matchScore +
    (row.is_pinned ? 50 : 0) +
    userUsageCount * 15 +
    (row.frequency || 0) * 2 +
    (row.organization_frequency || 0) +
    recencyBoost
  );
}

async function getUserDepartmentId(userId) {
  const profile = await db.InternalUserProfile.findOne({
    where: { user_id: userId },
    attributes: ["department_id"],
  });
  return profile?.department_id || null;
}

async function searchSuggestions({
  query = "",
  category,
  userId,
  departmentId,
  limit = 12,
}) {
  const q = normalizeText(query);
  const deptId = departmentId || (userId ? await getUserDepartmentId(userId) : null);

  const where = { is_active: true };
  if (category && CLINICAL_SUGGESTION_CATEGORIES.includes(category)) {
    where.category = category;
  }

  const deptFilter = deptId
    ? { [Op.or]: [{ department_id: deptId }, { department_id: { [Op.is]: null } }] }
    : { department_id: { [Op.is]: null } };

  const textFilter = q
    ? {
        [Op.or]: [
          { text: { [Op.iLike]: `${q}%` } },
          { text: { [Op.iLike]: `%${q}%` } },
        ],
      }
    : {};

  const rows = await db.ClinicalSuggestion.findAll({
    where: { ...where, ...deptFilter, ...textFilter },
    include: userId
      ? [
          {
            model: db.UserSuggestionUsage,
            as: "usageRows",
            where: { user_id: userId },
            required: false,
          },
        ]
      : [],
    limit: Math.min(Number(limit) || 12, 30),
    order: [
      ["is_pinned", "DESC"],
      ["organization_frequency", "DESC"],
      ["frequency", "DESC"],
    ],
  });

  const ranked = rows
    .map((row) => {
      const plain = format(row);
      const usage = plain.usageRows?.[0];
      const userUsageCount = usage?.usage_count || 0;
      return {
        ...plain,
        usageRows: undefined,
        user_usage_count: userUsageCount,
        score: scoreSuggestion(plain, q, userUsageCount),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked;
}

async function listSuggestions({ category, status, search, department_id } = {}) {
  const where = {};
  if (category) where.category = category;
  if (status === "active") where.is_active = true;
  if (status === "inactive") where.is_active = false;
  if (department_id) where.department_id = department_id;

  let rows = await db.ClinicalSuggestion.findAll({
    where,
    include: [
      {
        model: db.Department,
        as: "department",
        attributes: ["department_id", "name"],
        required: false,
      },
    ],
    order: [
      ["is_pinned", "DESC"],
      ["organization_frequency", "DESC"],
      ["text", "ASC"],
    ],
  });

  let data = rows.map(format);
  if (search) {
    const s = search.toLowerCase();
    data = data.filter((r) => r.text.toLowerCase().includes(s));
  }
  return data;
}

async function createSuggestion(payload, actorId) {
  const text = normalizeText(payload.text);
  if (!text) {
    const err = new Error("Suggestion text is required");
    err.status = 400;
    throw err;
  }
  if (payload.category && !CLINICAL_SUGGESTION_CATEGORIES.includes(payload.category)) {
    const err = new Error("Invalid category");
    err.status = 400;
    throw err;
  }

  const row = await db.ClinicalSuggestion.create({
    suggestion_id: uuidv4(),
    text,
    category: payload.category || "general",
    department_id: payload.department_id || null,
    created_by: actorId,
    is_pinned: Boolean(payload.is_pinned),
    is_active: payload.is_active !== false,
    organization_frequency: 1,
  });
  return format(row);
}

async function updateSuggestion(suggestionId, payload) {
  const row = await db.ClinicalSuggestion.findByPk(suggestionId);
  if (!row) {
    const err = new Error("Suggestion not found");
    err.status = 404;
    throw err;
  }
  if (payload.category && !CLINICAL_SUGGESTION_CATEGORIES.includes(payload.category)) {
    const err = new Error("Invalid category");
    err.status = 400;
    throw err;
  }

  await row.update({
    text: payload.text != null ? normalizeText(payload.text) : row.text,
    category: payload.category ?? row.category,
    department_id:
      payload.department_id !== undefined ? payload.department_id : row.department_id,
    is_pinned: payload.is_pinned !== undefined ? Boolean(payload.is_pinned) : row.is_pinned,
    is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : row.is_active,
  });
  return format(row);
}

async function removeSuggestion(suggestionId) {
  const row = await db.ClinicalSuggestion.findByPk(suggestionId);
  if (!row) {
    const err = new Error("Suggestion not found");
    err.status = 404;
    throw err;
  }
  await row.update({ is_active: false });
  return format(row);
}

async function recordUsage(suggestionId, userId) {
  const row = await db.ClinicalSuggestion.findByPk(suggestionId);
  if (!row || !row.is_active) {
    const err = new Error("Suggestion not found");
    err.status = 404;
    throw err;
  }

  const now = new Date();
  const [usage] = await db.UserSuggestionUsage.findOrCreate({
    where: { user_id: userId, suggestion_id: suggestionId },
    defaults: { usage_id: uuidv4(), usage_count: 0, last_used_at: now },
  });

  await usage.update({
    usage_count: usage.usage_count + 1,
    last_used_at: now,
  });

  await row.update({
    frequency: row.frequency + 1,
    organization_frequency: row.organization_frequency + 1,
    last_used_at: now,
  });

  return { success: true };
}

function extractLearnablePhrases(text) {
  const normalized = normalizeText(text);
  if (!normalized || normalized.length < 8) return [];

  const phrases = new Set();
  phrases.add(normalized);

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => normalizeText(s))
    .filter((s) => s.length >= 12 && s.length <= 280);
  sentences.forEach((s) => phrases.add(s));

  const words = normalized.split(/\s+/);
  for (let size = 3; size <= 6; size++) {
    for (let i = 0; i <= words.length - size; i++) {
      const chunk = words.slice(i, i + size).join(" ");
      if (chunk.length >= 12 && chunk.length <= 120) phrases.add(chunk);
    }
  }

  return [...phrases];
}

async function upsertLearnedPhrase({
  text,
  category = "general",
  departmentId,
  userId,
}) {
  const normalized = normalizeText(text);
  if (!normalized || normalized.length < 8) return null;

  const deptWhere = departmentId
    ? { department_id: departmentId }
    : { department_id: { [Op.is]: null } };

  const existing = await db.ClinicalSuggestion.findOne({
    where: {
      text: { [Op.iLike]: normalized },
      category,
      ...deptWhere,
    },
  });

  if (existing) {
    await existing.update({
      frequency: existing.frequency + 1,
      organization_frequency: existing.organization_frequency + 1,
      last_used_at: new Date(),
    });
    return existing.suggestion_id;
  }

  const row = await db.ClinicalSuggestion.create({
    suggestion_id: uuidv4(),
    text: normalized,
    category,
    department_id: departmentId || null,
    created_by: userId || null,
    frequency: 1,
    organization_frequency: 1,
    last_used_at: new Date(),
  });
  return row.suggestion_id;
}

async function learnFromText({ text, category = "general", userId, departmentId }) {
  const deptId = departmentId || (userId ? await getUserDepartmentId(userId) : null);
  const phrases = extractLearnablePhrases(text);
  let learned = 0;

  for (const phrase of phrases) {
    const id = await upsertLearnedPhrase({
      text: phrase,
      category,
      departmentId: deptId,
      userId,
    });
    if (id) learned += 1;
  }

  return { learned };
}

async function learnFromFormData({ formData, fieldsMeta = [], userId, defaultCategory }) {
  if (!formData || typeof formData !== "object") return { learned: 0 };

  let learned = 0;
  const deptId = userId ? await getUserDepartmentId(userId) : null;

  const metaByKey = Object.fromEntries(
    (fieldsMeta || []).map((f) => [f.field_key || f.key, f])
  );

  for (const [key, value] of Object.entries(formData)) {
    if (typeof value !== "string" || !value.trim()) continue;
    const meta = metaByKey[key];
    const fieldType = meta?.field_type;
    if (fieldType && !["textarea", "richtext", "input"].includes(fieldType)) continue;

    const category =
      meta?.config?.suggestion_category ||
      meta?.suggestion_category ||
      defaultCategory ||
      inferCategoryFromKey(key);

    const result = await learnFromText({
      text: value,
      category,
      userId,
      departmentId: deptId,
    });
    learned += result.learned;
  }

  return { learned };
}

function inferCategoryFromKey(key) {
  const k = String(key).toLowerCase();
  if (/diagnos|icd|condition/.test(k)) return "diagnosis";
  if (/assess|impression/.test(k)) return "assessment";
  if (/plan|treatment/.test(k)) return "plan";
  if (/prescri|rx|medication|instruction/.test(k)) return "prescription";
  if (/refer/.test(k)) return "referral";
  if (/procedur|operation/.test(k)) return "procedure";
  if (/certif|remark/.test(k)) return "certificate";
  return "general";
}

async function importDefaults(actorId) {
  let imported = 0;
  for (const phrase of DEFAULT_CLINICAL_PHRASES) {
    const exists = await db.ClinicalSuggestion.findOne({
      where: { text: { [Op.iLike]: phrase.text } },
    });
    if (exists) continue;
    await db.ClinicalSuggestion.create({
      suggestion_id: uuidv4(),
      text: phrase.text,
      category: phrase.category,
      created_by: actorId,
      is_pinned: true,
      organization_frequency: 1,
    });
    imported += 1;
  }
  return { imported };
}

module.exports = {
  searchSuggestions,
  listSuggestions,
  createSuggestion,
  updateSuggestion,
  removeSuggestion,
  recordUsage,
  learnFromText,
  learnFromFormData,
  importDefaults,
  CLINICAL_SUGGESTION_CATEGORIES,
};
