"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");

class RadiologySchedulingService {
  async logAudit(action, resourceId, staffId, details = {}) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: staffId,
        action,
        resourceType: "RadiologyResource",
        resourceId,
        details,
      });
    }
  }

  /**
   * Register radiology equipment or room resource (CT scanner, MRI, Ultrasound, X-Ray room).
   */
  async createResource(payload, staffId) {
    const { name, resource_type, location, active = true } = payload || {};

    if (!name?.trim() || !resource_type?.trim()) {
      const err = new Error("Resource name and resource_type are required");
      err.status = 400;
      throw err;
    }

    const resource = await db.RadiologyResource.create({
      id: uuidv4(),
      name: name.trim(),
      resource_type: resource_type.trim().toUpperCase(),
      location: location ? location.trim() : null,
      active: Boolean(active),
    });

    await this.logAudit("RADIOLOGY_RESOURCE_CREATED", resource.id, staffId, { name: resource.name });
    return resource.get({ plain: true });
  }

  /**
   * Find available time slots for equipment resource.
   */
  async findAvailableSlots(resourceId, dateStr) {
    const resource = await db.RadiologyResource.findByPk(resourceId);
    if (!resource) {
      const err = new Error("Radiology equipment resource not found");
      err.status = 404;
      throw err;
    }

    const availabilities = await db.RadiologyResourceAvailability.findAll({
      where: { resource_id: resourceId },
      order: [["available_from", "ASC"]],
    });

    return {
      resource: resource.get({ plain: true }),
      availabilities: availabilities.map((a) => a.get({ plain: true })),
    };
  }

  /**
   * Reserve equipment slot for radiology imaging study.
   */
  async reserveResource(resourceId, studyId, availableFrom, availableTo, staffId) {
    if (!resourceId || !availableFrom || !availableTo) {
      const err = new Error("resource_id, available_from, and available_to are required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const resource = await db.RadiologyResource.findByPk(resourceId, { transaction: t });
      if (!resource) {
        const err = new Error("Radiology equipment resource not found");
        err.status = 404;
        throw err;
      }

      const reservation = await db.RadiologyResourceAvailability.create(
        {
          id: uuidv4(),
          resource_id: resourceId,
          study_id: studyId || null,
          available_from: new Date(availableFrom),
          available_to: new Date(availableTo),
          maintenance_block: false,
        },
        { transaction: t }
      );

      await this.logAudit("RADIOLOGY_RESOURCE_RESERVED", reservation.id, staffId, { resource_id: resourceId, study_id: studyId }, t);

      await t.commit();
      return reservation.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Release equipment reservation slot.
   */
  async releaseResource(reservationId, staffId) {
    const reservation = await db.RadiologyResourceAvailability.findByPk(reservationId);
    if (!reservation) {
      const err = new Error("Reservation block not found");
      err.status = 404;
      throw err;
    }

    await reservation.destroy();
    await this.logAudit("RADIOLOGY_RESOURCE_RELEASED", reservationId, staffId);
    return { success: true, message: "Resource slot released" };
  }

  /**
   * List all active radiology equipment and room resources.
   */
  async listResources() {
    const resources = await db.RadiologyResource.findAll({
      where: { active: true },
      order: [["name", "ASC"]],
    });
    return resources.map((r) => r.get({ plain: true }));
  }
}

module.exports = new RadiologySchedulingService();
