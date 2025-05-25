const express = require("express");
const User = require("../models/user");
const {
  createProject,
  addFileToProject,
  addMultipleUsersToProject,
  getProjects,
  getProjectsByUserId,
  getProjectById,
  updateProject,
  deleteProject,
  fetchProjects,
  addUserToProject,
  removeUserFromProject,
} = require("../controllers/projectController");
const { isAuthenticated, isSuperAdmin, isProjectManager, isAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();
const multer = require("multer");

// Configure multer with better security settings
const upload = multer({
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10 // Limit number of files
  },
  fileFilter: (req, file, cb) => {
    // Allow only certain file types
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
  storage: multer.memoryStorage()
});

router.get("/", isAuthenticated, async (req, res, next) => {
  try {
    const { role, id } = req.user;
    if (role === "Admin") {
      // Only check admin role, don't send response
      await isAdmin(req, res, () => {});
      return fetchProjects(req, res, next);
    } else if (role === "Super Admin") {
      await isSuperAdmin(req, res, () => {});
      req.params.id = id;
      const user = await User.findById(id);
      console.log("user: ", user);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      req.params.id = user.organization;
      return getProjects(req, res, next);
    } else if (role === "Project Manager") {
      req.params.id = id;
      return getProjectsByUserId(req, res, next);
    } else if (role === "Team Member") {
      req.params.id = id;
      return getProjectsByUserId(req, res, next);
    } else if (role === "Developer") {
      req.params.id = id;
      return getProjectsByUserId(req, res, next);
    } else {
      return res.status(403).json({ message: "Unauthorized access" });
    }
  } catch (error) {
    next(error);
  }
});
// Project operations

router.post("/create", isAuthenticated, upload.array("files"),  createProject); // Create a project (only project managers)
// router.post("/add_files/:id", isAuthenticated, isProjectManager, addFileToProject);
// In your routes file
router.post('/add_multiple_users/:id', isAuthenticated, addMultipleUsersToProject);
router.post("/add_user/:id", isAuthenticated, addUserToProject); // Create a project (only super admins)
router.post("/remove_user/:id", isAuthenticated, removeUserFromProject); // Create a project (only super admins)
router.get("/organization/:id", isAuthenticated, getProjects); // Get all projects in an organization (authenticated users)
router.get("/:id", isAuthenticated, getProjectById); // Get a single project by ID (authenticated users)
router.put("/update/:id", isAuthenticated, isSuperAdmin, updateProject); // Update a project (only super admins)
router.delete("/delete/:id", isAuthenticated, isSuperAdmin, deleteProject); // Delete a project (only super admins)

module.exports = router;