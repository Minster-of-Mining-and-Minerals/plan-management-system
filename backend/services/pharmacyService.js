"use strict";

const { Op } = require("sequelize");
const { Pharmacy, PharmacyUserProfile, User } = require("../models");
const { PHARMACY_STATUS } = require("../config/pharmacyConstants");
const { getPagination, getPagingData } = require("../utils/pagination");

function formatPharmacy(record) {
  const plain = record?.toJSON ? record.toJSON() : record;
  if (!plain) return null;
  const userCount = plain.users?.length ?? plain.user_count ?? 0;
  return {
    ...plain,
    user_count: userCount,
  };
}

async function ensureUniquePharmacy({ pharmacy_code, pharmacy_name, excludeId }) {
  const where = {
    [Op.or]: [
      { pharmacy_code: pharmacy_code?.trim() },
      { pharmacy_name: pharmacy_name?.trim() },
    ],
  };
  if (excludeId) where.pharmacy_id = { [Op.ne]: excludeId };

  const existing = await Pharmacy.findOne({ where });
  if (!existing) return;

  if (existing.pharmacy_code === pharmacy_code?.trim()) {
    const err = new Error("Pharmacy code already exists");
    err.status = 400;
    throw err;
  }
  const err = new Error("Pharmacy name already exists");
  err.status = 400;
  throw err;
}

async function listPharmacies(query = {}) {
  const { status, search, page, limit, paginate } = query;
  const where = {};

  if (status === "active" || status === "inactive") {
    where.status = status;
  }

  if (search) {
    const term = `%${String(search).trim()}%`;
    where[Op.or] = [
      { pharmacy_name: { [Op.iLike]: term } },
      { pharmacy_code: { [Op.iLike]: term } },
      { email: { [Op.iLike]: term } },
    ];
  }

  const include = [
    {
      model: PharmacyUserProfile,
      as: "users",
      attributes: ["pharmacy_user_profile_id"],
      required: false,
    },
  ];

  const order = [["created_at", "DESC"]];

  if (paginate === "true" || paginate === true) {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const { limit: take, offset } = getPagination(pageNum, limitNum);

    const result = await Pharmacy.findAndCountAll({
      where,
      include,
      distinct: true,
      order,
      limit: take,
      offset,
    });

    const paging = getPagingData(result, pageNum, limitNum);
    return {
      paginated: true,
      count: paging.total,
      totalPages: paging.totalPages,
      currentPage: paging.currentPage,
      limit: paging.limit,
      data: paging.results.map(formatPharmacy),
    };
  }

  const rows = await Pharmacy.findAll({
    where,
    include,
    order: [["pharmacy_name", "ASC"]],
  });
  return { count: rows.length, data: rows.map(formatPharmacy) };
}

async function getPharmacyById(pharmacyId) {
  const record = await Pharmacy.findByPk(pharmacyId, {
    include: [
      {
        model: PharmacyUserProfile,
        as: "users",
        include: [
          {
            model: User,
            as: "user",
            attributes: ["user_id", "full_name", "email", "phone_number", "is_active"],
          },
        ],
      },
    ],
  });
  if (!record) {
    const err = new Error("Pharmacy not found");
    err.status = 404;
    throw err;
  }
  return formatPharmacy(record);
}

async function createPharmacy(payload, actorUserId) {
  const pharmacy_code = payload.pharmacy_code?.trim().toUpperCase();
  const pharmacy_name = payload.pharmacy_name?.trim();

  await ensureUniquePharmacy({ pharmacy_code, pharmacy_name });

  const record = await Pharmacy.create({
    pharmacy_name,
    pharmacy_code,
    license_number: payload.license_number?.trim() || null,
    phone: payload.phone?.trim() || null,
    email: payload.email?.trim() || null,
    address: payload.address?.trim() || null,
    city: payload.city?.trim() || null,
    region: payload.region?.trim() || null,
    country: payload.country?.trim() || null,
    contact_person: payload.contact_person?.trim() || null,
    logo: payload.logo || null,
    status: payload.status === PHARMACY_STATUS.INACTIVE ? PHARMACY_STATUS.INACTIVE : PHARMACY_STATUS.ACTIVE,
    created_by: actorUserId,
    updated_by: actorUserId,
  });

  return getPharmacyById(record.pharmacy_id);
}

async function updatePharmacy(pharmacyId, payload, actorUserId) {
  const record = await Pharmacy.findByPk(pharmacyId);
  if (!record) {
    const err = new Error("Pharmacy not found");
    err.status = 404;
    throw err;
  }

  const pharmacy_code = payload.pharmacy_code
    ? payload.pharmacy_code.trim().toUpperCase()
    : record.pharmacy_code;
  const pharmacy_name = payload.pharmacy_name?.trim() || record.pharmacy_name;

  await ensureUniquePharmacy({
    pharmacy_code,
    pharmacy_name,
    excludeId: pharmacyId,
  });

  await record.update({
    pharmacy_name,
    pharmacy_code,
    license_number: payload.license_number ?? record.license_number,
    phone: payload.phone ?? record.phone,
    email: payload.email ?? record.email,
    address: payload.address ?? record.address,
    city: payload.city ?? record.city,
    region: payload.region ?? record.region,
    country: payload.country ?? record.country,
    contact_person: payload.contact_person ?? record.contact_person,
    logo: payload.logo ?? record.logo,
    status: payload.status ?? record.status,
    updated_by: actorUserId,
  });

  return getPharmacyById(pharmacyId);
}

async function togglePharmacyStatus(pharmacyId, actorUserId) {
  const record = await Pharmacy.findByPk(pharmacyId);
  if (!record) {
    const err = new Error("Pharmacy not found");
    err.status = 404;
    throw err;
  }
  const nextStatus =
    record.status === PHARMACY_STATUS.ACTIVE
      ? PHARMACY_STATUS.INACTIVE
      : PHARMACY_STATUS.ACTIVE;
  await record.update({ status: nextStatus, updated_by: actorUserId });
  return getPharmacyById(pharmacyId);
}

async function deletePharmacy(pharmacyId) {
  const record = await Pharmacy.findByPk(pharmacyId);
  if (!record) {
    const err = new Error("Pharmacy not found");
    err.status = 404;
    throw err;
  }
  await record.destroy();
  return true;
}

async function listActivePharmacies() {
  const rows = await Pharmacy.findAll({
    where: { status: PHARMACY_STATUS.ACTIVE },
    attributes: ["pharmacy_id", "pharmacy_name", "pharmacy_code", "city", "region"],
    order: [["pharmacy_name", "ASC"]],
  });
  return rows.map((row) => (row.toJSON ? row.toJSON() : row));
}

module.exports = {
  formatPharmacy,
  listPharmacies,
  getPharmacyById,
  createPharmacy,
  updatePharmacy,
  togglePharmacyStatus,
  deletePharmacy,
  listActivePharmacies,
};
