"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");

class CareTeamService {
  async addTeamMember({ plan_id, patient_id, clinician_id, role = "OTHER", responsibilities }, addedBy) {
    if (!plan_id || !patient_id || !clinician_id || !addedBy) {
      throw Object.assign(new Error("plan_id, patient_id, clinician_id, and addedBy are required"), { status: 400 });
    }

    const member = await db.CareTeamMember.create({
      team_member_id: uuidv4(),
      plan_id,
      patient_id,
      clinician_id,
      role: role.toUpperCase(),
      responsibilities: responsibilities || null,
      added_by: addedBy,
    });

    return member.get({ plain: true });
  }

  async removeTeamMember(memberId) {
    const member = await db.CareTeamMember.findByPk(memberId);
    if (!member) throw Object.assign(new Error("Care team member not found"), { status: 404 });
    await member.destroy();
    return { removed: true, team_member_id: memberId };
  }

  async getTeamForPlan(planId) {
    const members = await db.CareTeamMember.findAll({
      where: { plan_id: planId },
      include: [{ model: db.User, as: "clinician", attributes: ["user_id", "full_name"] }],
      order: [["created_at", "ASC"]],
    });
    return members.map((m) => m.get({ plain: true }));
  }
}

module.exports = new CareTeamService();
