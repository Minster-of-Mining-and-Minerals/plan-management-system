"use strict";

const radiologyImageService = require("../services/radiologyImageService");

class RadiologyImageController {
  async registerImage(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const image = await radiologyImageService.registerImage(req.body, staffId);
      return res.status(201).json({
        success: true,
        data: image,
      });
    } catch (err) {
      next(err);
    }
  }

  async registerSeries(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const series = await radiologyImageService.registerSeries(req.body, staffId);
      return res.status(201).json({
        success: true,
        data: series,
      });
    } catch (err) {
      next(err);
    }
  }

  async attachImageToStudy(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const image = await radiologyImageService.attachImageToStudy(id, req.body, staffId);
      return res.status(201).json({
        success: true,
        data: image,
      });
    } catch (err) {
      next(err);
    }
  }

  async getStudyImages(req, res, next) {
    try {
      const { id } = req.params;
      const images = await radiologyImageService.getStudyImages(id);
      return res.json({
        success: true,
        data: images,
      });
    } catch (err) {
      next(err);
    }
  }

  async generateViewerLink(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const link = await radiologyImageService.generateViewerLink(id, staffId);
      return res.json({
        success: true,
        data: link,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RadiologyImageController();
