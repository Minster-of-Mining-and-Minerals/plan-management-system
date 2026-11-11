const { verifyFileToken } = require("../utils/fileTokenUtils");

function requireFileToken(scope) {
  return (req, res, next) => {
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ error: 1, message: "Missing file token" });
    }

    try {
      const verifyOptions = scope === "callback" ? { ignoreExpiration: true } : {};
      const decoded = verifyFileToken(token, verifyOptions);
      if (decoded.scope !== scope) {
        return res.status(403).json({ error: 1, message: "Invalid token scope" });
      }
      if (decoded.documentId !== req.params.id) {
        return res.status(403).json({ error: 1, message: "Token mismatch" });
      }
      if (scope === "version-file") {
        const tokenVersion = Number(decoded.versionNumber);
        const routeVersion = Number(req.params.versionNumber);
        if (!tokenVersion || tokenVersion !== routeVersion) {
          return res.status(403).json({ error: 1, message: "Version token mismatch" });
        }
      }
      req.fileToken = decoded;
      return next();
    } catch (error) {
      return res.status(403).json({ error: 1, message: "Invalid or expired token" });
    }
  };
}

module.exports = { requireFileToken };
