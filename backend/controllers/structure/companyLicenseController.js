"use strict";

const { Op } = require("sequelize");
const {
  CompanyLicense,
  Company,
  LicenseType,
  CompanyProductionAssignment,
  ProductionItem,
  GoldMeasurementUnit,
  sequelize,
} = require("../../models");

/**
 * List licenses with filters.
 */
async function listLicenses(req, res) {
  try {
    const {
      company_id,
      license_type_id,
      region,
      mineral_type,
      status,
      search,
      is_active,
    } = req.query;

    const where = {};

    if (company_id) {
      where.company_id = company_id;
    }

    if (license_type_id) {
      where.license_type_id = license_type_id;
    }

    if (region && region.trim()) {
      where.region = { [Op.iLike]: `%${region.trim()}%` };
    }

    if (mineral_type && mineral_type.trim()) {
      where.mineral_type = { [Op.iLike]: `%${mineral_type.trim()}%` };
    }

    if (status && status.trim()) {
      where.status = status.trim().toLowerCase();
    }

    if (is_active !== undefined && is_active !== "") {
      where.is_active = is_active === "true" || is_active === true;
    }

    const companyIncludeWhere = {};

    // If company user, enforce scope to caller's company
    if (req.user?.is_company && req.user.company_id) {
      where.company_id = req.user.company_id;
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { license_number: { [Op.iLike]: term } },
        { license_name: { [Op.iLike]: term } },
        { mineral_type: { [Op.iLike]: term } },
        { region: { [Op.iLike]: term } },
        { zone: { [Op.iLike]: term } },
        { woreda: { [Op.iLike]: term } },
        { "$company.name$": { [Op.iLike]: term } },
      ];
    }

    const licenses = await CompanyLicense.findAll({
      where,
      include: [
        {
          model: Company,
          as: "company",
          attributes: ["company_id", "name", "code", "abbreviation", "logo_path"],
          where: Object.keys(companyIncludeWhere).length > 0 ? companyIncludeWhere : undefined,
        },
        {
          model: LicenseType,
          as: "licenseType",
          attributes: ["license_type_id", "name", "code"],
        },
        {
          model: CompanyProductionAssignment,
          as: "productionAssignments",
          where: { is_active: true },
          required: false,
          attributes: ["assignment_id", "production_item_id"],
        },
      ],
      order: [["created_at", "DESC"], ["license_number", "ASC"]],
    });

    const data = licenses.map((lic) => {
      const plain = lic.toJSON ? lic.toJSON() : { ...lic };
      return {
        ...plain,
        production_items_count: plain.productionAssignments ? plain.productionAssignments.length : 0,
      };
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("Error listing licenses:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get single license by ID.
 */
async function getLicenseById(req, res) {
  try {
    const { id } = req.params;

    const license = await CompanyLicense.findByPk(id, {
      include: [
        {
          model: Company,
          as: "company",
          attributes: [
            "company_id",
            "name",
            "code",
            "abbreviation",
            "registration_number",
            "contact_person",
            "email",
            "phone",
            "address",
            "logo_path",
          ],
        },
        {
          model: LicenseType,
          as: "licenseType",
          attributes: ["license_type_id", "name", "code", "description"],
        },
        {
          model: CompanyProductionAssignment,
          as: "productionAssignments",
          where: { is_active: true },
          required: false,
          include: [
            {
              model: ProductionItem,
              as: "productionItem",
              include: [{ model: GoldMeasurementUnit, as: "baseUnit" }],
            },
            {
              model: GoldMeasurementUnit,
              as: "defaultReportingUnit",
            },
          ],
        },
      ],
    });

    if (!license) {
      return res.status(404).json({ success: false, message: "License not found." });
    }

    // Company user isolation
    if (req.user?.is_company && req.user.company_id && license.company_id !== req.user.company_id) {
      return res.status(403).json({ success: false, message: "Access denied to this company license." });
    }

    const plain = license.toJSON ? license.toJSON() : { ...license };

    // Extract vertices from GeoJSON for coordinate table display
    let vertices = [];
    if (plain.boundary_geojson?.coordinates?.[0]) {
      vertices = plain.boundary_geojson.coordinates[0].map((coord, idx) => ({
        order: idx + 1,
        longitude: coord[0],
        latitude: coord[1],
      }));
    }

    return res.status(200).json({
      success: true,
      data: {
        ...plain,
        vertices,
        production_items_count: plain.productionAssignments ? plain.productionAssignments.length : 0,
      },
    });
  } catch (err) {
    console.error("Error getting license:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Helper to compute centroid from polygon coordinates.
 */
function calculateCentroid(coordinates) {
  if (!coordinates || !coordinates[0] || coordinates[0].length === 0) return { lat: null, lon: null };
  const ring = coordinates[0];
  let sumLat = 0;
  let sumLon = 0;
  for (const pt of ring) {
    sumLon += Number(pt[0]) || 0;
    sumLat += Number(pt[1]) || 0;
  }
  return {
    lat: Number((sumLat / ring.length).toFixed(7)),
    lon: Number((sumLon / ring.length).toFixed(7)),
  };
}

/**
 * Create a new license.
 */
async function createLicense(req, res) {
  try {
    const {
      company_id,
      license_type_id,
      license_number,
      license_name,
      status,
      issued_date,
      effective_start_date,
      effective_end_date,
      effective_year_from,
      effective_year_to,
      mineral_type,
      region,
      zone,
      woreda,
      location_details,
      latitude,
      longitude,
      boundary_geojson,
      spatial_reference,
      description,
      is_active,
    } = req.body;

    if (!company_id) {
      return res.status(400).json({ success: false, message: "Company ID is required." });
    }
    if (!license_type_id) {
      return res.status(400).json({ success: false, message: "License Type ID is required." });
    }
    if (!license_number || !license_number.trim()) {
      return res.status(400).json({ success: false, message: "License Number is required." });
    }

    // Company user isolation
    if (req.user?.is_company && req.user.company_id && req.user.company_id !== company_id) {
      return res.status(403).json({ success: false, message: "Cannot issue license to another company." });
    }

    // Verify company
    const company = await Company.findByPk(company_id);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found." });
    }

    // Verify license type
    const licenseType = await LicenseType.findByPk(license_type_id);
    if (!licenseType) {
      return res.status(404).json({ success: false, message: "License Type not found." });
    }

    // Check duplicate license number
    const cleanLicNo = license_number.trim();
    const existing = await CompanyLicense.findOne({
      where: { license_number: { [Op.iLike]: cleanLicNo } },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `License number '${cleanLicNo}' already exists.`,
      });
    }

    // Validate dates
    if (effective_start_date && effective_end_date) {
      if (new Date(effective_end_date) < new Date(effective_start_date)) {
        return res.status(400).json({
          success: false,
          message: "Effective end date cannot be earlier than effective start date.",
        });
      }
    }

    // Calculate centroid if boundary is provided and coords are missing
    let finalLat = latitude;
    let finalLon = longitude;
    if (boundary_geojson?.coordinates && (!finalLat || !finalLon)) {
      const centroid = calculateCentroid(boundary_geojson.coordinates);
      finalLat = centroid.lat;
      finalLon = centroid.lon;
    }

    const license = await CompanyLicense.create({
      company_id,
      license_type_id,
      license_number: cleanLicNo,
      license_name: license_name ? license_name.trim() : null,
      status: status || "active",
      issued_date: issued_date || null,
      effective_start_date: effective_start_date || null,
      effective_end_date: effective_end_date || null,
      effective_year_from: effective_year_from || (effective_start_date ? new Date(effective_start_date).getFullYear() : null),
      effective_year_to: effective_year_to || (effective_end_date ? new Date(effective_end_date).getFullYear() : null),
      mineral_type: mineral_type ? mineral_type.trim() : null,
      region: region ? region.trim() : null,
      zone: zone ? zone.trim() : null,
      woreda: woreda ? woreda.trim() : null,
      location_details: location_details ? location_details.trim() : null,
      latitude: finalLat || null,
      longitude: finalLon || null,
      boundary_geojson: boundary_geojson || null,
      spatial_reference: spatial_reference || "GCS Adindan",
      description: description ? description.trim() : null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
    });

    return res.status(201).json({ success: true, data: license });
  } catch (err) {
    console.error("Error creating license:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Update an existing license.
 */
async function updateLicense(req, res) {
  try {
    const { id } = req.params;
    const license = await CompanyLicense.findByPk(id);
    if (!license) {
      return res.status(404).json({ success: false, message: "License not found." });
    }

    // Company user isolation
    if (req.user?.is_company && req.user.company_id && license.company_id !== req.user.company_id) {
      return res.status(403).json({ success: false, message: "Cannot edit another company's license." });
    }

    const {
      license_type_id,
      license_number,
      license_name,
      status,
      issued_date,
      effective_start_date,
      effective_end_date,
      effective_year_from,
      effective_year_to,
      mineral_type,
      region,
      zone,
      woreda,
      location_details,
      latitude,
      longitude,
      boundary_geojson,
      spatial_reference,
      description,
      is_active,
    } = req.body;

    const updates = {};

    if (license_number !== undefined) {
      const cleanLicNo = license_number.trim();
      if (!cleanLicNo) {
        return res.status(400).json({ success: false, message: "License number cannot be empty." });
      }
      const existing = await CompanyLicense.findOne({
        where: {
          license_number: { [Op.iLike]: cleanLicNo },
          license_id: { [Op.ne]: id },
        },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `License number '${cleanLicNo}' is already taken.`,
        });
      }
      updates.license_number = cleanLicNo;
    }

    if (license_type_id !== undefined) {
      const lType = await LicenseType.findByPk(license_type_id);
      if (!lType) {
        return res.status(404).json({ success: false, message: "License Type not found." });
      }
      updates.license_type_id = license_type_id;
    }

    // Dates check
    const effStart = effective_start_date !== undefined ? effective_start_date : license.effective_start_date;
    const effEnd = effective_end_date !== undefined ? effective_end_date : license.effective_end_date;
    if (effStart && effEnd && new Date(effEnd) < new Date(effStart)) {
      return res.status(400).json({
        success: false,
        message: "Effective end date cannot be earlier than effective start date.",
      });
    }

    if (effective_start_date !== undefined) updates.effective_start_date = effective_start_date;
    if (effective_end_date !== undefined) updates.effective_end_date = effective_end_date;
    if (effective_year_from !== undefined) updates.effective_year_from = effective_year_from;
    if (effective_year_to !== undefined) updates.effective_year_to = effective_year_to;
    if (issued_date !== undefined) updates.issued_date = issued_date;

    if (license_name !== undefined) updates.license_name = license_name ? license_name.trim() : null;
    if (status !== undefined) updates.status = status;
    if (mineral_type !== undefined) updates.mineral_type = mineral_type ? mineral_type.trim() : null;
    if (region !== undefined) updates.region = region ? region.trim() : null;
    if (zone !== undefined) updates.zone = zone ? zone.trim() : null;
    if (woreda !== undefined) updates.woreda = woreda ? woreda.trim() : null;
    if (location_details !== undefined) updates.location_details = location_details ? location_details.trim() : null;
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (spatial_reference !== undefined) updates.spatial_reference = spatial_reference;
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    if (boundary_geojson !== undefined) {
      updates.boundary_geojson = boundary_geojson;
      if (boundary_geojson?.coordinates) {
        const centroid = calculateCentroid(boundary_geojson.coordinates);
        updates.latitude = centroid.lat;
        updates.longitude = centroid.lon;
      }
    } else {
      if (latitude !== undefined) updates.latitude = latitude;
      if (longitude !== undefined) updates.longitude = longitude;
    }

    await license.update(updates);
    return res.status(200).json({ success: true, data: license });
  } catch (err) {
    console.error("Error updating license:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Delete a license.
 */
async function deleteLicense(req, res) {
  try {
    const { id } = req.params;
    const license = await CompanyLicense.findByPk(id);
    if (!license) {
      return res.status(404).json({ success: false, message: "License not found." });
    }

    // Check if assignments exist
    const assignmentsCount = await CompanyProductionAssignment.count({
      where: { license_id: id, is_active: true },
    });

    if (assignmentsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete license with ${assignmentsCount} active production assignments. Deactivate the assignments first.`,
      });
    }

    await license.destroy();
    return res.status(200).json({ success: true, message: "License deleted successfully." });
  } catch (err) {
    console.error("Error deleting license:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  listLicenses,
  getLicenseById,
  createLicense,
  updateLicense,
  deleteLicense,
};
