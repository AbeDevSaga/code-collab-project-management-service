const jwt = require("jsonwebtoken");

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Middleware to check if user is an admin
const isAdmin = (req, res, next) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }
  next();
};

const isSuperAdmin = async (req, res, next) => {
  if (req.user?.role !== "Super Admin") {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }
  next();
};

module.exports = { isAuthenticated, isAdmin, isSuperAdmin };