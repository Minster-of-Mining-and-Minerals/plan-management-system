"use strict";

const executionQueueService = require("../../services/executionQueueService");

const listQueues = async (req, res) => {
  try {
    const data = await executionQueueService.listQueues(req.query);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const getQueue = async (req, res) => {
  try {
    const data = await executionQueueService.getQueueById(req.params.queueId);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const claimTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await executionQueueService.claimTask(taskId, req.user.user_id);
    return res.json({ success: true, data: task });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const releaseTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { reason } = req.body;
    const task = await executionQueueService.releaseTask(taskId, req.user.user_id, reason);
    return res.json({ success: true, data: task });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const transferTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { target_queue_id, notes } = req.body;
    if (!target_queue_id) {
      return res.status(400).json({ success: false, message: "target_queue_id is required" });
    }
    const task = await executionQueueService.transferTask(taskId, target_queue_id, req.user.user_id, notes);
    return res.json({ success: true, data: task });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const escalateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { reason } = req.body;
    const task = await executionQueueService.escalateTask(taskId, req.user.user_id, reason);
    return res.json({ success: true, data: task });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

module.exports = {
  listQueues,
  getQueue,
  claimTask,
  releaseTask,
  transferTask,
  escalateTask,
};
