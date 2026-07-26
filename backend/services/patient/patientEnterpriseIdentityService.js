"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");

class PatientEnterpriseIdentityService {
  /**
   * Links a global patient identity to a facility record with a facility-specific MRN.
   */
  async registerPatientAtFacility({ patient_id, tenant_id, facility_id, facility_mrn }) {
    if (!patient_id || !facility_id) {
      throw new Error("patient_id and facility_id are required");
    }

    const tenantId = tenant_id || "DEFAULT_HOSPITAL";
    const generatedMrn = facility_mrn || `MRN-${facility_id.slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;

    let record = await db.PatientFacilityRecord.findOne({
      where: {
        patient_id,
        facility_id,
      },
    });

    if (record) {
      await record.update({
        facility_mrn: generatedMrn,
        status: "ACTIVE",
      });
    } else {
      record = await db.PatientFacilityRecord.create({
        record_id: uuidv4(),
        patient_id,
        tenant_id: tenantId,
        facility_id,
        facility_mrn: generatedMrn,
        registration_date: new Date(),
        status: "ACTIVE",
      });
    }

    return record.get({ plain: true });
  }

  /**
   * Retrieves global patient profile along with facility records across all network facilities.
   */
  async getGlobalPatientIdentity(patientId) {
    const user = await db.User.findByPk(patientId, {
      include: [
        { model: db.PatientProfile, as: "patientProfile" },
        {
          model: db.PatientFacilityRecord,
          as: "patientFacilityRecords",
          include: [
            { model: db.Facility, as: "facility" },
            { model: db.OrganizationTenant, as: "tenant" },
          ],
        },
      ],
    });

    if (!user) return null;
    return user.get({ plain: true });
  }

  /**
   * Get facility record for a specific patient & facility.
   */
  async getPatientFacilityRecord(patientId, facilityId) {
    const record = await db.PatientFacilityRecord.findOne({
      where: { patient_id: patientId, facility_id: facilityId },
      include: [
        { model: db.Facility, as: "facility" },
        { model: db.OrganizationTenant, as: "tenant" },
      ],
    });

    if (!record) return null;
    return record.get({ plain: true });
  }

  /**
   * Search patients across facilities using global patient identity.
   */
  async searchEnterprisePatients(queryStr) {
    const { Op } = db.Sequelize;
    const users = await db.User.findAll({
      where: {
        account_type: "PATIENT",
        [Op.or]: [
          { full_name: { [Op.iLike || Op.like]: `%${queryStr}%` } },
          { email: { [Op.iLike || Op.like]: `%${queryStr}%` } },
          { phone_number: { [Op.iLike || Op.like]: `%${queryStr}%` } },
        ],
      },
      include: [
        { model: db.PatientProfile, as: "patientProfile" },
        { model: db.PatientFacilityRecord, as: "patientFacilityRecords" },
      ],
    });

    return users.map((u) => u.get({ plain: true }));
  }
}

module.exports = new PatientEnterpriseIdentityService();
