const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
dotenv.config({ path: path.join(__dirname, ".env") });

const { bootstrapSecurityEnv } = require("./config/securityBootstrap");
bootstrapSecurityEnv();

const { PLATFORM_NAME } = require("./config/platformBranding");
const logger = require("./utils/logger");
const { requestIdMiddleware } = require("./middlewares/requestIdMiddleware");

const { swaggerUi, swaggerSpec } = require("./swagger");

// ================== Here Import Routes=================

// User Management Routes
const userRoute = require("./routers/user/userRoutes");
const roleRoute = require("./routers/user/roleRoutes"); 
const userRoleRoute = require("./routers/user/userRoleRoutes");
const authRoute = require("./routers/user/authRoutes");
const permissionRoute = require("./routers/user/permissionRoutes");
const permissionGroupRoute = require("./routers/user/permissionGroupRoutes");
const changePasswordRoutes = require("./routers/user/passwordChangeRoutes");
const forgotPasswordRoutes = require("./routers/user/forgotPasswordRoutes");

const dashboardRoutes = require("./routers/dashboardRoutes");
const formFieldRoutes = require("./routers/formField/formFieldRoutes");
const formFieldGroupRoutes = require("./routers/formField/formFieldGroupRoutes");
const patientRoutes = require("./routers/patient/patientRoutes");
const scheduleRoutes = require("./routers/schedule/scheduleRoutes");
const appointmentRoutes = require("./routers/appointment/appointmentRoutes");
const diagnosisFormConfigRoutes = require("./routers/diagnosis/diagnosisFormConfigRoutes");
const diagnosisTemplateRoutes = require("./routers/diagnosis/diagnosisTemplateRoutes");
const diagnosisRecordRoutes = require("./routers/diagnosis/diagnosisRecordRoutes");
const medicalDiagramRoutes = require("./routers/diagnosis/medicalDiagramRoutes");
const medicalDiagramCategoryRoutes = require("./routers/diagnosis/medicalDiagramCategoryRoutes");
const medicalWorkflowRoutes = require("./routers/workflow/medicalWorkflowRoutes");
const prescriptionCategoryRoutes = require("./routers/prescription/prescriptionCategoryRoutes");
const prescriptionTemplateRoutes = require("./routers/prescription/prescriptionTemplateRoutes");
const prescriptionDocumentTemplateRoutes = require("./routers/prescription/prescriptionDocumentTemplateRoutes");
const medicalCertificateRoutes = require("./routers/medicalCertificate/medicalCertificateRoutes");
const medicalCertificateTemplateRoutes = require("./routers/medicalCertificate/medicalCertificateTemplateRoutes");
const clinicalSuggestionRoutes = require("./routers/clinical/clinicalSuggestionRoutes");
const timelineRoutes = require("./routers/clinical/timelineRoutes");
const clinicalRuleRoutes = require("./routers/clinical/clinicalRuleRoutes");
const clinicalDocumentRoutes = require("./routers/clinical/clinicalDocumentRoutes");
const prescriptionRoutes = require("./routers/prescription/prescriptionRoutes");
const notificationRoutes = require("./routers/notification/notificationRoutes");
const pharmacyRoutes = require("./routers/pharmacy/pharmacyRoutes");
const pharmacyPortalRoutes = require("./routers/pharmacy/pharmacyPortalRoutes");
const patientPortalRoutes = require("./routers/patient/patientPortalRoutes");
const encounterFollowUpRoutes = require("./routers/followUp/encounterFollowUpRoutes");
const clinicalOrderRoutes = require("./routes/clinicalOrderRoutes");
const laboratoryRoutes = require("./routes/laboratoryRoutes");
const radiologyRoutes = require("./routes/radiologyRoutes");

// System Branding Routes
const brandingRoutes = require("./routers/system/brandingRoutes");

// Organization Routes
const departmentRoutes = require("./routers/organization/departmentRoutes");
const userTitleRoutes = require("./routers/organization/userTitleRoutes");
const billingServiceRoutes = require("./routers/finance/billingServiceRoutes");
const billingServiceCategoryRoutes = require("./routers/finance/billingServiceCategoryRoutes");
const appointmentBillingRoutes = require("./routers/finance/appointmentBillingRoutes");
const cashierRoutes = require("./routers/finance/cashierRoutes");
const receiptTemplateRoutes = require("./routers/finance/receiptTemplateRoutes");



// ================== Attachment Routes ==========================
const attachmentRoute = require("./routers/attachment-routes/attachmentRoute");
const healthRoutes = require("./routers/healthRoutes");

const app = express();
const appServer = http.createServer(app);

app.use(requestIdMiddleware);

app.use(
  express.json({
    limit: "15mb",
    verify: (req, res, buf) => {
      if (!buf.length) return; // allow empty body
      try {
        JSON.parse(buf);
      } catch (e) {
        // Don't throw the error after sending response
        const error = new Error("Invalid JSON payload");
        error.status = 400;
        error.expose = true;
        throw error;
      }
    },
  })
);

app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

// ===========Serve static files (PDFs, non-PHI public assets)=====================
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res, filePath) => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      if (filePath.endsWith(".pdf")) {
        res.set("Content-Disposition", "inline");
      }
    },
  })
);

const serveUploadsStatic = process.env.SERVE_UPLOADS_STATIC !== "false";

if (serveUploadsStatic) {
  // Block PHI attachment files; use GET /api/attachments/:id/file instead.
  app.use("/uploads", (req, res, next) => {
    const normalized = String(req.path || "").replace(/\\/g, "/");
    if (
      normalized === "/attachments" ||
      normalized.startsWith("/attachments/")
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Attachment files require authentication. Use GET /api/attachments/:id/file",
      });
    }
    return next();
  });

  app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"), {
      setHeaders: (res) => {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type");
      },
    })
  );
} else {
  console.log(
    "Static /uploads disabled (SERVE_UPLOADS_STATIC=false). Serve files via authenticated APIs."
  );
}

// ================== CORS Configuration ==================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:4000",
  process.env.FRONTEND_URL,
];
const isProduction = process.env.NODE_ENV === "production";
const corsOptions = {
  origin: isProduction
    ? (origin, callback) => {
        if (!origin || allowedOrigins.filter(Boolean).includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    : true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// ================== Database Connection ==================
const { sequelize } = require("./models");

sequelize
  .authenticate()
  .then(() => logger.info("database_connected"))
  .catch((err) =>
    logger.error({ err: err.message }, "database_connection_error")
  );

// ================== Swagger Setup ==================
if (!isProduction || process.env.ENABLE_SWAGGER === "true") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// ================== API Routes go here ==================

const {
  authLoginLimiter,
  passwordResetLimiter,
} = require("./middlewares/rateLimitMiddleware");

// User Management Routes
app.use("/api/users", userRoute);
app.use("/api/patients", patientRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/diagnosis-form-configs", diagnosisFormConfigRoutes);
app.use("/api/diagnosis-templates", diagnosisTemplateRoutes);
app.use("/api/diagnosis-records", diagnosisRecordRoutes);
app.use("/api/medical-diagrams", medicalDiagramRoutes);
app.use("/api/medical-diagram-categories", medicalDiagramCategoryRoutes);
app.use("/api/workflow", medicalWorkflowRoutes);
app.use("/api/prescription-categories", prescriptionCategoryRoutes);
app.use("/api/prescription-templates", prescriptionTemplateRoutes);
app.use("/api/prescription-document-templates", prescriptionDocumentTemplateRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/medical-certificate-templates", medicalCertificateTemplateRoutes);
app.use("/api/medical-certificates", medicalCertificateRoutes);
app.use("/api/clinical-suggestions", clinicalSuggestionRoutes);
app.use("/api/timeline", timelineRoutes);
app.use("/api/clinical-rules", clinicalRuleRoutes);
app.use("/api/clinical-documents", clinicalDocumentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/pharmacies", pharmacyRoutes);
app.use("/api/pharmacy-portal", pharmacyPortalRoutes);
app.use("/api/patient-portal", patientPortalRoutes);
app.use("/api/form-fields", formFieldRoutes);
app.use("/api/form-field-groups", formFieldGroupRoutes);
app.use("/api/roles", roleRoute);
app.use("/api/user-roles", userRoleRoute);
app.use("/api/auth/login", authLoginLimiter);
app.use("/api/auth", authRoute);
app.use("/api/auth/forgot-password", passwordResetLimiter, forgotPasswordRoutes);
app.use("/api/change-password", changePasswordRoutes);
app.use("/api/permissions", permissionRoute);
app.use("/api/permission-groups", permissionGroupRoute);


app.use("/api/dashboard", dashboardRoutes);

// Branding Routes
app.use("/api/branding", brandingRoutes);

// Department Routes
app.use("/api/departments", departmentRoutes);

// User title Routes
app.use("/api/user-titles", userTitleRoutes);

// Billing Routes
app.use("/api/billing-services", billingServiceRoutes);
app.use("/api/billing-service-categories", billingServiceCategoryRoutes);
app.use("/api/appointment-billing", appointmentBillingRoutes);
app.use("/api/finance/cashier", cashierRoutes);
app.use("/api/finance/receipt-templates", receiptTemplateRoutes);
app.use("/api/audit-logs", require("./routers/audit/auditLogRoutes"));

// Follow-up Routes
app.use("/api/follow-ups", encounterFollowUpRoutes);

// Clinical Order Routes
app.use("/api/orders", clinicalOrderRoutes);

// Laboratory Domain Routes
app.use("/api/laboratory", laboratoryRoutes);

// Radiology Domain Routes
app.use("/api/radiology", radiologyRoutes);

// Medication Safety Engine Routes
app.use("/api/medication-safety", require("./routers/medication/medicationSafetyRoutes"));

// Pharmacy Inventory & Controlled Drug Routes
app.use("/api/pharmacy/inventory", require("./routers/pharmacy/pharmacyInventoryRoutes"));

// Pharmacy Hardening & Multi-Branch Routes
app.use("/api/pharmacy/hardening", require("./routers/pharmacy/pharmacyHardeningRoutes"));

// Pharmacy Enterprise Final Hardening Routes
app.use("/api/pharmacy/enterprise", require("./routers/pharmacy/pharmacyEnterpriseRoutes"));

// Unified Cross-Domain Clinical Order Harmonization Routes
app.use("/api/clinical-orders/unified", require("./routers/clinicalOrder/unifiedClinicalOrderRoutes"));

// Clinical Data Integrity, Audit & Compliance Routes
app.use("/api/clinical-integrity", require("./routers/clinicalIntegrity/clinicalIntegrityRoutes"));

// Clinical Intelligence, Decision Support & Patient Context Routes
app.use("/api/clinical-intelligence", require("./routers/clinicalIntelligence/clinicalIntelligenceRoutes"));

// Clinical Care Plan, Goal Management & Patient Outcome Tracking Routes
app.use("/api/care-management", require("./routers/careManagement/careManagementRoutes"));

// Enterprise Clinical Operations Center, Orchestration & Predictive Routes
app.use("/api/operations", require("./routes/clinicalOperationsRoutes"));
app.use("/api/operations/capacity", require("./routes/clinicalCapacityRoutes"));
app.use("/api/operations/incidents", require("./routes/clinicalIncidentRoutes"));
app.use("/api/operations/predictive", require("./routes/predictiveOperationsRoutes"));

// ================== Api Attachment Routes =====================
app.use("/api/attachments", attachmentRoute);

// ================== Health (no auth) ===========================
app.use("/api", healthRoutes);

// ================== Root Endpoint ==================
app.get("/", (req, res) => {
  res.json({ message: `Welcome to ${PLATFORM_NAME} API` });
});

// ================== Error Handler ==================
app.use((err, req, res, next) => {
  const { sendError } = require("./utils/httpError");
  return sendError(res, err, req);
});

// ================== Socket.IO (same HTTP server — M8) ==================
const jwt = require("jsonwebtoken");
const io = new Server(appServer, {
  cors: corsOptions,
  path: "/socket.io",
});

const onlineUsers = new Map();

io.use((socket, next) => {
  try {
    const authHeader = socket.handshake.headers?.authorization;
    const bearer =
      typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;
    const token =
      socket.handshake.auth?.token ||
      bearer ||
      (typeof socket.handshake.query?.token === "string"
        ? socket.handshake.query.token
        : null);

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.user_id) {
      return next(new Error("Invalid token"));
    }
    socket.data.userId = decoded.user_id;
    socket.data.tokenVersion = Number(decoded.token_version || 0);
    return next();
  } catch (err) {
    return next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.userId;
  if (userId) {
    onlineUsers.set(userId, socket.id);
    logger.info({ userId, socketId: socket.id }, "socket_connected");
  }

  socket.on("disconnect", () => {
    if (userId && onlineUsers.get(userId) === socket.id) {
      onlineUsers.delete(userId);
    }
    logger.info({ userId }, "socket_disconnected");
  });
});

app.set("socketio", io);

let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, "shutdown_start");

  const forceTimer = setTimeout(() => {
    logger.error("shutdown_forced");
    process.exit(1);
  }, 15000);
  forceTimer.unref?.();

  await Promise.allSettled([
    new Promise((resolve) => appServer.close(resolve)),
    new Promise((resolve) => {
      try {
        io.close(() => resolve());
      } catch {
        resolve();
      }
    }),
  ]);

  try {
    await sequelize.close();
  } catch (err) {
    logger.error({ err: err.message }, "sequelize_close_error");
  }

  clearTimeout(forceTimer);
  logger.info("shutdown_complete");
  process.exit(0);
}

function startServers() {
  const appPort = process.env.PORT || 4000;
  appServer.listen(appPort, () => {
    logger.info({ port: appPort }, "http_and_socket_listening");
  });

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

if (require.main === module) {
  startServers();
}

module.exports = { app, appServer, io, onlineUsers, startServers, gracefulShutdown };