"use strict";

const timelineEventService = require("../../services/timelineEventService");

async function listEvents(req, res, next) {
  try {
    const { patientId } = req.params;
    const isPatientPortal = req.user.account_type === "PATIENT";

    // Security: Patient portal users can only query their own patient timeline.
    if (isPatientPortal && req.user.user_id !== patientId) {
      return res.status(403).json({ error: "Access denied: cannot view another patient's timeline" });
    }

    const events = await timelineEventService.listForPatient(patientId, {
      isPatientPortal,
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0,
    });

    return res.json(events);
  } catch (err) {
    next(err);
  }
}

async function emitEvent(req, res, next) {
  try {
    if (req.user.account_type === "PATIENT") {
      return res.status(403).json({ error: "Patients are not authorized to publish timeline events" });
    }

    const event = await timelineEventService.emit({
      ...req.body,
      actor_id: req.user.user_id,
    });

    return res.status(201).json(event);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listEvents,
  emitEvent,
};
