const express = require("express");
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  fetchProjects,
} = require("../controllers/projectController");
const { isAuthenticated, isSuperAdmin, isAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// Debug operation
router.get("/", isAuthenticated, isAdmin, fetchProjects); // Fetch all projects (only admins)

// Project operations
router.post("/create", isAuthenticated, isSuperAdmin, createProject); // Create a project (only super admins)
router.get("/organization/:id", isAuthenticated, getProjects); // Get all projects in an organization (authenticated users)
router.get("/:id", isAuthenticated, getProjectById); // Get a single project by ID (authenticated users)
router.put("/update/:id", isAuthenticated, isSuperAdmin, updateProject); // Update a project (only super admins)
router.delete("/delete/:id", isAuthenticated, isSuperAdmin, deleteProject); // Delete a project (only super admins)

module.exports = router;