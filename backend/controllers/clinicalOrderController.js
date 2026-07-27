"use strict";

const clinicalOrderService = require("../services/clinicalOrderService");

class ClinicalOrderController {
  async createOrder(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const order = await clinicalOrderService.createOrder(req.body, staffId);
      return res.status(201).json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  async getOrder(req, res, next) {
    try {
      const order = await clinicalOrderService.getOrder(req.params.id);
      return res.json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  async listEncounterOrders(req, res, next) {
    try {
      const orders = await clinicalOrderService.listOrdersForEncounter(req.params.appointmentId);
      return res.json({
        success: true,
        data: orders,
      });
    } catch (err) {
      next(err);
    }
  }

  async listPatientOrders(req, res, next) {
    try {
      const orders = await clinicalOrderService.listOrdersForPatient(req.params.patientId);
      return res.json({
        success: true,
        data: orders,
      });
    } catch (err) {
      next(err);
    }
  }

  async listDepartmentQueue(req, res, next) {
    try {
      const departmentId = req.params.departmentId;
      const filters = {
        status: req.query.status,
        order_type: req.query.order_type,
      };
      const orders = await clinicalOrderService.listDepartmentQueue(departmentId, filters);
      return res.json({
        success: true,
        data: orders,
      });
    } catch (err) {
      next(err);
    }
  }

  async acceptOrder(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const order = await clinicalOrderService.acceptOrder(req.params.id, staffId);
      return res.json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateOrderStatus(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { status } = req.body;
      const order = await clinicalOrderService.updateOrderStatus(req.params.id, status, staffId);
      return res.json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  async recordResult(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const order = await clinicalOrderService.recordResult(req.params.id, req.body, staffId);
      return res.json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  async cancelOrder(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { cancellation_reason } = req.body;
      const order = await clinicalOrderService.cancelOrder(
        req.params.id,
        cancellation_reason,
        staffId
      );
      return res.json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  async amendResult(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const order = await clinicalOrderService.amendResult(req.params.id, req.body, staffId);
      return res.json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  async autoAssignQueueOrder(req, res, next) {
    try {
      const staffId = req.user?.user_id || req.user?.id;
      const { department_id } = req.body || {};
      const order = await clinicalOrderService.autoAssignQueueOrder(
        req.params.id,
        department_id,
        staffId
      );
      return res.json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ClinicalOrderController();
