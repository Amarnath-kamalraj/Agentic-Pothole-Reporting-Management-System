const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. Invalid token format." });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user info to request
      req.user = decoded;

      // Optionally fetch full user from database
      const user = await User.findById(decoded.userId).select("-password");
      if (!user) {
        return res.status(401).json({ error: "User not found." });
      }

      req.userDoc = user;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Authentication error." });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.userDoc && req.userDoc.role === "admin") {
    next();
  } else {
    res
      .status(403)
      .json({ error: "Access denied. Admin privileges required." });
  }
};

// Middleware to check if user is admin or authority
const requireAuthority = (req, res, next) => {
  if (
    req.userDoc &&
    (req.userDoc.role === "admin" || req.userDoc.role === "authority")
  ) {
    next();
  } else {
    res
      .status(403)
      .json({ error: "Access denied. Authority privileges required." });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireAuthority,
};
