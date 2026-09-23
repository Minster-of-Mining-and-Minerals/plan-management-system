const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const path = require("path");
const bodyParser = require("body-parser");

dotenv.config();

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

// Structure Routes



// Plan Management Routes
// const planRoutes = require("./routers/plan/planRoutes");
// const planAssignmentRoutes = require("./routers/plan/planAssignmentRoutes");
// const performanceColorThresholdRoutes = require("./routers/config/performanceColorThresholdRoutes");
// const brandingRoutes = require("./routers/config/brandingRoutes");
// const systemSettingsRoutes = require("./routers/config/systemSettingsRoutes");
// const systemAuditLogRoutes = require("./routers/config/systemAuditLogRoutes");
// const noteRoutes = require("./routers/config/noteRoutes");
const notificationRoutes = require("./routers/notification/notificationRoutes");
// const issueRoutes = require("./routers/issue/issueRoutes");
// const issueCategoryRoutes = require("./routers/issue/issueCategoryRoutes");
// const formConfigContainerRoutes = require("./routers/issue/formConfigContainerRoutes");

// ================== Attachment Routes ==========================
const attachmentRoute = require("./routers/attachment-routes/attachmentRoute");
const { mountCollaboration } = require("./collaborationIntegration");

const app = express();
const appServer = http.createServer(app);

app.use(
  express.json({
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

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

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
  "http://196.189.159.132:3000",
  "http://196.189.159.132:4000",
  "https://plan.system.com.et",
  process.env.FRONTEND_URL,
  process.env.APP_URL,
].filter(Boolean);
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser / same-origin requests (no Origin header)
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
      callback(null, true);
      return;
    }
    callback(null, allowedOrigins.includes(origin));
  },
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
app.use("/api/roles", roleRoute);
app.use("/api/user-roles", userRoleRoute);
app.use("/api/auth", authRoute);
app.use("/api/auth/forgot-password", forgotPasswordRoutes);
app.use("/api/change-password", changePasswordRoutes);
app.use("/api/permissions", permissionRoute);
app.use("/api/permission-groups", permissionGroupRoute);


// Structure Routes



// Plan Management Routes
// app.use("/api/plan", planRoutes);
// app.use("/api/plan-assignments", planAssignmentRoutes);
// app.use("/api/performance-color-thresholds", performanceColorThresholdRoutes);
// app.use("/api/branding", brandingRoutes);
// app.use("/api/system-settings", systemSettingsRoutes);
// app.use("/api/system-audit-logs", systemAuditLogRoutes);
// app.use("/api/notes", noteRoutes);
app.use("/api/notifications", notificationRoutes);
// app.use("/api/issues", issueRoutes);
// app.use("/api/issue-categories", issueCategoryRoutes);
// app.use("/api/form-config-containers", formConfigContainerRoutes);

// ================== Api Attachment Routes =====================
app.use("/api/attachments", attachmentRoute);

// ================== Health Check Route ========================
const healthRoutes = require("./routers/healthRoutes");
app.use("/api", healthRoutes);

// ================== Root Endpoint ==================
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Issue Tracking System API 🚀" });
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
// const { warmSystemSettingsCache } = require("./services/systemSettingsService");
const warmSystemSettingsCache = async () => {};

const appPort = process.env.PORT || 4000;
const appHost = process.env.HOST || "0.0.0.0";
warmSystemSettingsCache()
  .catch((error) => {
    console.error("Failed to warm system settings cache:", error.message);
  })
  .finally(async () => {
    try {
      await mountCollaboration(app);
    } catch (error) {
      console.error("Failed to mount collaboration routes:", error.message);
      if (process.env.NODE_ENV === "production") {
        process.exit(1);
      }
    }

    appServer.listen(appPort, appHost, () => {
      console.log(` App server running at http://${appHost}:${appPort}`);
      try {
        const {
          startExecutionWindowOverrideExpiryJob,
        } = require("./jobs/executionWindowOverrideExpiryJob");
        startExecutionWindowOverrideExpiryJob();
      } catch (error) {
        console.error("Failed to start execution window override expiry job:", error.message);
      }
    });
  });

// ================== Socket.IO Setup ==================
const socketServer = http.createServer();
const io = new Server(socketServer, {
  cors: corsOptions,
});

const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error("Socket authentication required"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.user_id;
    return next();
  } catch {
    return next(new Error("Invalid socket token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.userId;

  if (userId) {
    onlineUsers.set(userId, socket.id);
    console.log(` User ${userId} connected: ${socket.id}`);
  }

  socket.on("disconnect", () => {
    if (userId) {
      onlineUsers.delete(userId);
    }
    console.log(`User ${userId} disconnected`);
  });
});

const socketPort = process.env.SOCKET_PORT || 5000;
const socketHost = process.env.SOCKET_HOST || "0.0.0.0";
socketServer.listen(socketPort, socketHost, () => {
  console.log(`Socket.IO server running at http://${socketHost}:${socketPort}`);
});

// Make Socket.IO accessible globally
app.set("socketio", io);
app.set("io", io);

module.exports = { appServer, io, onlineUsers };

// Expose the server using
// cloudflared tunnel --url http://localhost:4000
