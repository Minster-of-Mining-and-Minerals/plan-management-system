"use strict";

const db = require("../models");
const {
  User,
  UserSession,
  UserDeviceRestriction,
  IpRestriction,
  SessionSecurityLog,
} = db;
const {
  createSession,
  validateSession,
  terminateSession,
  terminateAllUserSessions,
  restrictDevice,
  unrestrictDevice,
  restrictIp,
  unrestrictIp,
  assertSessionScopeAccessible,
} = require("../services/sessionSecurityService");
const jwt = require("jsonwebtoken");
const { hashToken } = require("../utils/deviceDetector");

async function runVerification() {
  console.log("=== STARTING USER SESSION & DEVICE SECURITY VERIFICATION ===");

  // Find a test user (Super Admin or any active user)
  const user = await User.findOne({
    where: { is_active: true },
    include: [
      { model: db.Role, as: "roles" },
      { model: db.Region, as: "region" },
    ],
  });

  if (!user) {
    throw new Error("No active user found in database to run tests against.");
  }

  console.log(`✓ Test User found: ${user.email} (ID: ${user.user_id})`);

  const mockReq1 = {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "x-forwarded-for": "196.188.12.34",
    },
    app: { get: () => null },
  };

  // ----------------------------------------------------
  // TEST 1: Session Generation on Login
  // ----------------------------------------------------
  console.log("\n--- Test 1: Session Generation on Login ---");
  const sessionResult = await createSession({
    user,
    req: mockReq1,
    clientData: { device_name: "Test Workstation 1" },
  });

  if (!sessionResult?.sessionId) {
    throw new Error("Failed to create session on login");
  }

  const session1 = await UserSession.findByPk(sessionResult.sessionId);
  if (!session1 || session1.status !== "active") {
    throw new Error("Session status is not active in database");
  }
  console.log(`✓ Created Session ID: ${session1.session_id}`);
  console.log(`✓ Device: ${session1.device_name}, OS: ${session1.operating_system}, Browser: ${session1.browser}`);
  console.log(`✓ IP: ${session1.ip_address}, Status: ${session1.status}`);

  // ----------------------------------------------------
  // TEST 2: Session Validation in AuthenticateToken
  // ----------------------------------------------------
  console.log("\n--- Test 2: Session Validation ---");
  const validatedSession = await validateSession({
    sessionId: session1.session_id,
    userId: user.user_id,
    req: mockReq1,
  });
  if (!validatedSession || validatedSession.session_id !== session1.session_id) {
    throw new Error("validateSession failed for active session");
  }
  console.log("✓ Active session successfully validated");

  // ----------------------------------------------------
  // TEST 3: Terminate Other Sessions (User Self-Management)
  // ----------------------------------------------------
  console.log("\n--- Test 3: Terminate All Other Sessions ---");
  const mockReq2 = {
    headers: {
      "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
      "x-forwarded-for": "196.188.99.88",
    },
    app: { get: () => null },
  };
  const sessionResult2 = await createSession({
    user,
    req: mockReq2,
    clientData: { device_name: "Test iPhone 15" },
  });
  console.log(`✓ Created second session (iPhone): ${sessionResult2.sessionId}`);

  // User actor object with self-permissions
  const actorUserSelf = {
    user_id: user.user_id,
    domain: user.region_id ? "regional" : "federal",
    region_id: user.region_id,
    permissions: [
      "USER_SESSION:VIEW_OWN",
      "USER_SESSION:TERMINATE_OWN",
      "USER_SESSION:TERMINATE_ALL_OWN",
      "USER_SESSION:RESTRICT_OWN_DEVICE",
      "USER_SESSION:UNRESTRICT_OWN_DEVICE",
    ],
    roles: [],
  };

  const terminatedCount = await terminateAllUserSessions({
    targetUserId: user.user_id,
    actorUser: actorUserSelf,
    exceptSessionId: session1.session_id,
    reason: "test_terminate_other",
    req: mockReq1,
  });
  console.log(`✓ Terminated other sessions count: ${terminatedCount}`);

  // Verify session2 is terminated
  const reloadedSession2 = await UserSession.findByPk(sessionResult2.sessionId);
  if (reloadedSession2.status !== "terminated") {
    throw new Error(`Expected session 2 to be terminated, but status is ${reloadedSession2.status}`);
  }
  console.log("✓ Second session successfully verified as terminated");

  // Verify session 2 token validation now throws SESSION_TERMINATED
  try {
    await validateSession({
      sessionId: sessionResult2.sessionId,
      userId: user.user_id,
      req: mockReq2,
    });
    throw new Error("Expected validateSession to reject terminated session 2, but it succeeded");
  } catch (err) {
    if (err.code !== "SESSION_TERMINATED") {
      throw err;
    }
    console.log(`✓ Immediate token revocation verified: validateSession threw ${err.code}: "${err.message}"`);
  }

  // Verify session1 is still active
  const reloadedSession1 = await UserSession.findByPk(session1.session_id);
  if (reloadedSession1.status !== "active") {
    throw new Error(`Expected current session to remain active, but status is ${reloadedSession1.status}`);
  }
  console.log("✓ Current session remains active");

  // ----------------------------------------------------
  // TEST 4: Restrict Device & Subsequent Login Rejection
  // ----------------------------------------------------
  console.log("\n--- Test 4: Device Restriction Enforcement ---");
  const { generateDeviceFingerprint } = require("../utils/deviceDetector");
  const mockReqRestricted = {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0",
      "x-forwarded-for": "196.188.12.34",
      "x-device-id": "test-hardware-id-123",
    },
    app: { get: () => null },
  };
  const testFingerprint = generateDeviceFingerprint(mockReqRestricted, "test-hardware-id-123");

  const restriction = await restrictDevice({
    userId: user.user_id,
    deviceFingerprintHash: testFingerprint,
    deviceName: "Compromised Laptop",
    deviceType: "desktop",
    reason: "Suspicious login test",
    actorUser: actorUserSelf,
    req: mockReq1,
  });
  console.log(`✓ Device restricted: ${restriction.restriction_id} (Hash: ${testFingerprint.slice(0, 16)}...)`);

  // Test that attempting login from that device fails with DEVICE_RESTRICTED
  try {
    await createSession({
      user,
      req: mockReqRestricted,
      clientData: { device_id: "test-hardware-id-123" },
    });
    throw new Error("Expected createSession to be blocked by device restriction, but it succeeded");
  } catch (err) {
    if (err.code !== "DEVICE_RESTRICTED") {
      throw err;
    }
    console.log(`✓ Device restriction blocked login: ${err.code}: "${err.message}"`);
  }

  // Test unrestrict device
  const unrestrictRes = await unrestrictDevice({
    restrictionId: restriction.restriction_id,
    actorUser: actorUserSelf,
  });
  if (unrestrictRes.is_active !== false) {
    throw new Error("Device restriction was not marked inactive");
  }
  console.log("✓ Device unrestricted successfully");

  // ----------------------------------------------------
  // TEST 5: IP Restriction & Subnet Blocking
  // ----------------------------------------------------
  console.log("\n--- Test 5: IP Restriction Enforcement ---");
  const adminActor = {
    user_id: user.user_id,
    domain: "federal",
    is_federal: true,
    permissions: [
      "USER_SESSION:RESTRICT_IP",
      "USER_SESSION:UNRESTRICT_IP",
      "USER_SESSION:TERMINATE",
      "USER_SESSION:VIEW",
    ],
    roles: ["Super Admin"],
  };

  const testIp = "192.0.2.123";
  const ipRestriction = await restrictIp({
    ipAddress: testIp,
    reason: "Brute force attack simulation",
    actorUser: adminActor,
    req: mockReq1,
  });
  console.log(`✓ IP address ${testIp} restricted: ID ${ipRestriction.restriction_id}`);

  const mockReqIpBlocked = {
    headers: {
      "user-agent": "Mozilla/5.0",
      "x-forwarded-for": testIp,
    },
    app: { get: () => null },
  };

  try {
    await createSession({
      user,
      req: mockReqIpBlocked,
    });
    throw new Error("Expected createSession to be blocked by IP restriction, but it succeeded");
  } catch (err) {
    if (err.code !== "IP_RESTRICTED") {
      throw err;
    }
    console.log(`✓ IP restriction blocked login: ${err.code}: "${err.message}"`);
  }

  // Unrestrict IP
  await unrestrictIp({
    restrictionId: ipRestriction.restriction_id,
    actorUser: adminActor,
  });
  console.log(`✓ IP address ${testIp} unblocked successfully`);

  // ----------------------------------------------------
  // TEST 6: Domain Isolation & Scope Access Assertion
  // ----------------------------------------------------
  console.log("\n--- Test 6: Domain Isolation Boundary Enforcement ---");
  const regionalAdminActor = {
    user_id: "00000000-0000-0000-0000-000000000001",
    is_regional: true,
    region_id: "11111111-1111-1111-1111-111111111111",
    domain: "regional",
    roles: ["Regional Administrator"],
    permissions: ["USER_SESSION:TERMINATE"],
  };

  const foreignSession = {
    session_id: "22222222-2222-2222-2222-222222222222",
    domain: "regional",
    region_id: "99999999-9999-9999-9999-999999999999", // Different region!
  };

  try {
    assertSessionScopeAccessible(foreignSession, regionalAdminActor);
    throw new Error("Expected assertSessionScopeAccessible to deny access to foreign region session");
  } catch (err) {
    if (err.status !== 403) {
      throw err;
    }
    console.log(`✓ Domain boundary strictly protected: ${err.status}: "${err.message}"`);
  }

  // Clean up test sessions
  await UserSession.destroy({
    where: { session_id: [session1.session_id, sessionResult2.sessionId] },
  });
  console.log("✓ Test sessions cleaned up");

  console.log("\n=======================================================");
  console.log("🎉 ALL USER SESSION & DEVICE SECURITY TESTS PASSED! 🎉");
  console.log("=======================================================");
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ VERIFICATION FAILED:", err);
    process.exit(1);
  });
