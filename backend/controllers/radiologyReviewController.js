"use strict";

const radiologyReviewService = require("../services/radiologyReviewService");

class RadiologyReviewController {
  async assignReview(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const { doctor_id } = req.body;
      const review = await radiologyReviewService.assignReview(id, doctor_id || staffId, staffId);
      return res.status(201).json({
        success: true,
        data: review,
      });
    } catch (err) {
      next(err);
    }
  }

  async completeReview(req, res, next) {
    try {
      const doctorId = req.user.user_id;
      const { id } = req.params;
      const review = await radiologyReviewService.completeReview(id, req.body, doctorId);
      return res.json({
        success: true,
        data: review,
      });
    } catch (err) {
      next(err);
    }
  }

  async recordDecision(req, res, next) {
    try {
      const doctorId = req.user.user_id;
      const { id } = req.params;
      const review = await radiologyReviewService.recordDecision(id, req.body, doctorId);
      return res.json({
        success: true,
        data: review,
      });
    } catch (err) {
      next(err);
    }
  }

  async getStudyReviews(req, res, next) {
    try {
      const { id } = req.params;
      const reviews = await radiologyReviewService.getStudyReviews(id);
      return res.json({
        success: true,
        data: reviews,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RadiologyReviewController();
