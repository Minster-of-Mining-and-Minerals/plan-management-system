"use strict";

const db = require("../../models");
const { UserSession, UserDeviceRestriction, User } = db;
const {
  terminateSession,
  terminateAllUserSessions,
  restrictDevice,
  unrestrictDevice,
} = require("../../services/sessionSecurityService");
const { getSafeSessionId } = require("../../utils/deviceDetector");
const { Op } = require("sequelize");

/**
 * Get active and recent sessions for the authenticated user
 */
const getMySessions = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const currentSessionId = req.sessionId;

    const sessions = await UserSession.findAll({
      where: { user_id: userId },
      order: [
        ["status", "ASC"], // "active" comes before "terminated" alphabetically or we can sort by last_activity_at
        ["last_activity_at", "DESC"],
      ],
      limit: 50,
    });

    const formattedSessions = sessions.map((s) => {
      const isCurrent = s.session_id === currentSessionId;
      return {
        session_id: s.session_id,
        masked_id: getSafeSessionId(s.session_id),
        device_name: s.device_name || "Unknown Device",
        device_type: s.device_type || "desktop",
        operating_system: s.operating_system || "Unknown OS",
        browser: s.browser || "Unknown Browser",
        browser_version: s.browser_version || "",
        ip_address: s.ip_address,
        location: s.location || "Addis Ababa, Ethiopia",
        status: s.status,
        created_at: s.created_at,
        last_activity_at: s.last_activity_at,
        expires_at: s.expires_at,
        terminated_at: s.terminated_at,
        termination_reason: s.termination_reason,
        is_current: isCurrent,
        device_fingerprint_hash: s.device_fingerprint_hash,
      };
    });

    // Put current session first
    formattedSessions.sort((a, b) => {
      if (a.is_current) return -1;
      if (b.is_current) return 1;
      return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
    });

    return res.status(200).json({
      success: true,
      data: formattedSessions,
    });
  } catch (error) {
    console.error("getMySessions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user sessions",
      error: error.message,
    });
  }
};

/**
 * Terminate a single session belonging to the user
 */
const terminateMySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Session ID is required" });
    }

    const session = await UserSession.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    if (session.user_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: "You can only terminate your own sessions" });
    }

    const terminated = await terminateSession({
      sessionId,
      actorUser: req.user,
      reason: req.body.reason || "user_self_termination",
      req,
    });

    return res.status(200).json({
      success: true,
      message: "Session terminated successfully",
      data: {
        session_id: terminated.session_id,
        status: terminated.status,
      },
    });
  } catch (error) {
    console.error("terminateMySession error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to terminate session",
    });
  }
};

/**
 * Terminate all other sessions belonging to the user, keeping the current session
 */
const terminateOtherSessions = async (req, res) => {
  try {
    const count = await terminateAllUserSessions({
      targetUserId: req.user.user_id,
      actorUser: req.user,
      exceptSessionId: req.sessionId,
      reason: "user_terminated_all_other_sessions",
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully terminated ${count} other active session(s)`,
      data: { terminated_count: count },
    });
  } catch (error) {
    console.error("terminateOtherSessions error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to terminate other sessions",
    });
  }
};

/**
 * Get distinct devices seen for this user with restriction status
 */
const getMyDevices = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get active device restrictions for this user
    const now = new Date();
    const restrictions = await UserDeviceRestriction.findAll({
      where: {
        user_id: userId,
        is_active: true,
        [Op.or]: [
          { expires_at: null },
          { expires_at: { [Op.gt]: now } },
        ],
      },
    });

    const restrictionMap = new Map();
    restrictions.forEach((r) => {
      restrictionMap.set(r.device_fingerprint_hash, r);
    });

    // Get all sessions for this user to extract unique devices
    const sessions = await UserSession.findAll({
      where: { user_id: userId },
      order: [["last_activity_at", "DESC"]],
      limit: 100,
    });

    const deviceMap = new Map();
    sessions.forEach((s) => {
      const hash = s.device_fingerprint_hash;
      if (!hash) return;
      if (!deviceMap.has(hash)) {
        const restriction = restrictionMap.get(hash);
        deviceMap.set(hash, {
          device_fingerprint_hash: hash,
          device_name: s.device_name || "Unknown Device",
          device_type: s.device_type || "desktop",
          operating_system: s.operating_system || "Unknown OS",
          browser: s.browser || "Unknown Browser",
          last_ip: s.ip_address,
          last_active_at: s.last_activity_at,
          is_current: s.session_id === req.sessionId,
          is_restricted: !!restriction,
          restriction_id: restriction ? restriction.restriction_id : null,
          restriction_reason: restriction ? restriction.restriction_reason : null,
          restricted_at: restriction ? restriction.restricted_at : null,
          expires_at: restriction ? restriction.expires_at : null,
        });
      }
    });

    // Also include any restrictions that might not have an existing session
    restrictions.forEach((r) => {
      if (!deviceMap.has(r.device_fingerprint_hash)) {
        deviceMap.set(r.device_fingerprint_hash, {
          device_fingerprint_hash: r.device_fingerprint_hash,
          device_name: r.device_name || "Restricted Device",
          device_type: r.device_type || "desktop",
          operating_system: r.operating_system || "Unknown",
          browser: r.browser || "Unknown",
          last_ip: null,
          last_active_at: r.restricted_at,
          is_current: false,
          is_restricted: true,
          restriction_id: r.restriction_id,
          restriction_reason: r.restriction_reason,
          restricted_at: r.restricted_at,
          expires_at: r.expires_at,
        });
      }
    });

    const devices = Array.from(deviceMap.values()).sort((a, b) => {
      if (a.is_current) return -1;
      if (b.is_current) return 1;
      return new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime();
    });

    return res.status(200).json({
      success: true,
      data: devices,
    });
  } catch (error) {
    console.error("getMyDevices error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch devices",
      error: error.message,
    });
  }
};

/**
 * Restrict one of the user's own devices
 */
const restrictMyDevice = async (req, res) => {
  try {
    const {
      device_fingerprint_hash,
      device_name,
      device_type,
      operating_system,
      browser,
      reason,
      duration_minutes,
    } = req.body;

    if (!device_fingerprint_hash) {
      return res.status(400).json({ success: false, message: "Device fingerprint hash is required" });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: "Restriction reason is required" });
    }

    const restriction = await restrictDevice({
      userId: req.user.user_id,
      deviceFingerprintHash: device_fingerprint_hash,
      deviceName,
      deviceType,
      operatingSystem,
      browser,
      reason,
      actorUser: req.user,
      durationMinutes: duration_minutes ? parseInt(duration_minutes, 10) : null,
      req,
    });

    return res.status(201).json({
      success: true,
      message: "Device restricted successfully. All sessions on this device have been invalidated.",
      data: restriction,
    });
  } catch (error) {
    console.error("restrictMyDevice error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to restrict device",
    });
  }
};

/**
 * Remove a restriction placed on one of the user's devices
 */
const unrestrictMyDevice = async (req, res) => {
  try {
    const { restriction_id } = req.body;
    if (!restriction_id) {
      return res.status(400).json({ success: false, message: "Restriction ID is required" });
    }

    const restriction = await unrestrictDevice({
      restrictionId: restriction_id,
      actorUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Device restriction removed successfully.",
      data: restriction,
    });
  } catch (error) {
    console.error("unrestrictMyDevice error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to remove device restriction",
    });
  }
};

module.exports = {
  getMySessions,
  terminateMySession,
  terminateOtherSessions,
  getMyDevices,
  restrictMyDevice,
  unrestrictMyDevice,
};

