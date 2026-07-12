const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
dotenv.config({ path: path.join(__dirname, ".env") });

const { PLATFORM_NAME } = require("./config/platformBranding");

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
const prescriptionRoutes = require("./routers/prescription/prescriptionRoutes");
const notificationRoutes = require("./routers/notification/notificationRoutes");
const pharmacyRoutes = require("./routers/pharmacy/pharmacyRoutes");
const pharmacyPortalRoutes = require("./routers/pharmacy/pharmacyPortalRoutes");
const patientPortalRoutes = require("./routers/patient/patientPortalRoutes");

// System Branding Routes
const brandingRoutes = require("./routers/system/brandingRoutes");

// Organization Routes
const departmentRoutes = require("./routers/organization/departmentRoutes");
const userTitleRoutes = require("./routers/organization/userTitleRoutes");
const billingServiceRoutes = require("./routers/finance/billingServiceRoutes");
const billingServiceCategoryRoutes = require("./routers/finance/billingServiceCategoryRoutes");
const appointmentBillingRoutes = require("./routers/finance/appointmentBillingRoutes");



// ================== Attachment Routes ==========================
const attachmentRoute = require("./routers/attachment-routes/attachmentRoute");
const healthRoutes = require("./routers/healthRoutes");

const app = express();
const appServer = http.createServer(app);

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

// ===========Serve static files (PDFs, uploads)=====================
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

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath) => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
    },
  })
);

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
  .then(() => console.log(" Database connected successfully"))
  .catch((err) => console.error(" Database connection error:", err));

// ================== Swagger Setup ==================
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ================== API Routes go here ==================


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
app.use("/api/notifications", notificationRoutes);
app.use("/api/pharmacies", pharmacyRoutes);
app.use("/api/pharmacy-portal", pharmacyPortalRoutes);
app.use("/api/patient-portal", patientPortalRoutes);
app.use("/api/form-fields", formFieldRoutes);
app.use("/api/form-field-groups", formFieldGroupRoutes);
app.use("/api/roles", roleRoute);
app.use("/api/user-roles", userRoleRoute);
app.use("/api/auth", authRoute);
app.use("/api/auth/forgot-password", forgotPasswordRoutes);
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
  console.error("Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ================== Start App Server ==================
const appPort = process.env.PORT || 4000;
appServer.listen(appPort, () => {
  console.log(` App server running at http://localhost:${appPort}`);
});

// ================== Socket.IO Setup ==================
const socketServer = http.createServer();
const io = new Server(socketServer, {
  cors: corsOptions,
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    onlineUsers.set(userId, socket.id);
    console.log(` User ${userId} connected: ${socket.id}`);
  }

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    console.log(`User ${userId} disconnected`);
  });
});

const socketPort = process.env.SOCKET_PORT || 5000;
socketServer.listen(socketPort, () => {
  console.log(`Socket.IO server running at http://localhost:${socketPort}`);
});

// Make Socket.IO accessible globally
app.set("socketio", io);

module.exports = { appServer, io, onlineUsers };

// Expose the server using
// cloudflared tunnel --url http://localhost:4000
