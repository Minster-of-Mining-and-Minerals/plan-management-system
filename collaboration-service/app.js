require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { authenticateToken } = require("./middlewares/authMiddleware");
const { initCollaboration, createCollaborationRouter } = require("./mount");

const app = express();
const port = process.env.PORT || 4100;

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

function collaborationAuth(req, res, next) {
  authenticateToken(req, res, () => {
    const authHeader = req.headers.authorization;
    req.accessToken = authHeader && authHeader.split(" ")[1];
    next();
  });
}

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "collaboration-service",
    timestamp: new Date().toISOString(),
  });
});

app.use((err, _req, res, _next) => {
  console.error("Collaboration service error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

initCollaboration()
  .then(() => {
    console.log("Collaboration database connected");
    app.use("/api/v1", createCollaborationRouter({ authenticateToken: collaborationAuth }));
    app.listen(port, () => {
      console.log(`Collaboration service running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Collaboration database connection failed:", error.message);
    process.exit(1);
  });

module.exports = app;
