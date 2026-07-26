"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");

class UserFacilityAssignmentService {
  async assignUserToFacility(data) {
    if (!data.user_id || !data.facility_id) {
      throw new Error("user_id and facility_id are required for facility assignment");
    }

    const tenantId = data.tenant_id || "DEFAULT_HOSPITAL";

    // If marked default, unset other defaults for this user
    if (data.is_default) {
      await db.UserFacilityAssignment.update(
        { is_default: false },
        { where: { user_id: data.user_id } }
      );
    }

    // Check if assignment already exists
    let assignment = await db.UserFacilityAssignment.findOne({
      where: {
        user_id: data.user_id,
        facility_id: data.facility_id,
      },
    });

    if (assignment) {
      await assignment.update({
        role_id: data.role_id || assignment.role_id,
        role_name: data.role_name || assignment.role_name,
        is_default: data.is_default !== undefined ? data.is_default : assignment.is_default,
        status: data.status || "ACTIVE",
      });
    } else {
      assignment = await db.UserFacilityAssignment.create({
        assignment_id: data.assignment_id || uuidv4(),
        user_id: data.user_id,
        tenant_id: tenantId,
        facility_id: data.facility_id,
        role_id: data.role_id || null,
        role_name: data.role_name || "Staff",
        is_default: data.is_default || false,
        status: data.status || "ACTIVE",
      });
    }

    return assignment.get({ plain: true });
  }

  async getUserAssignments(userId) {
    const assignments = await db.UserFacilityAssignment.findAll({
      where: { user_id: userId, status: "ACTIVE" },
      include: [
        { model: db.Facility, as: "facility" },
        { model: db.OrganizationTenant, as: "tenant" },
      ],
    });

    return assignments.map((a) => a.get({ plain: true }));
  }

  async getUserRoleForFacility(userId, facilityId) {
    const assignment = await db.UserFacilityAssignment.findOne({
      where: { user_id: userId, facility_id: facilityId, status: "ACTIVE" },
    });

    if (!assignment) return null;
    return {
      role_id: assignment.role_id,
      role_name: assignment.role_name,
      tenant_id: assignment.tenant_id,
      facility_id: assignment.facility_id,
    };
  }

  async removeUserAssignment(assignmentId) {
    const assignment = await db.UserFacilityAssignment.findByPk(assignmentId);
    if (assignment) {
      await assignment.destroy();
    }
    return true;
  }
}

module.exports = new UserFacilityAssignmentService();
