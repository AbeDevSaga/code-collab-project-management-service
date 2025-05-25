const express = require("express");
const {
  createTasks,
  updateTask,
  deleteTask,
  getAllTasks,
  getTaskById,
  getTasksByProjectId,
  getTasksByStatus,
  getTasksByAssignedUser,
} = require("../controllers/taskController");
const { isAuthenticated } = require("../middlewares/authMiddleware");

const router = express.Router();

// SuperAdmin only Basic Routes

// Admin and Super Admin Basic Routes

router.get("/", isAuthenticated, getAllTasks);
router.post("/create", isAuthenticated, createTasks);
router.put("/update/:id", isAuthenticated, updateTask);
router.delete("/delete/:id", isAuthenticated, deleteTask);
router.get("/project/:projectId", isAuthenticated, getTasksByProjectId);
router.get("/status/:status", isAuthenticated, getTasksByStatus);
router.get("/assigned/:id", isAuthenticated, getTasksByAssignedUser);

router.get("/:id", isAuthenticated, getTaskById);

module.exports = router;