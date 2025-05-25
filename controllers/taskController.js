const Task = require("../models/task");
const Project = require("../models/project");

// Create one or multiple tasks and update the project
const createTasks = async (req, res) => {
  console.log("createTasks");
  try {
    const tasksData = req.body;
    const {id} = req.user;

    // Validate request body exists
    if (!tasksData) {
      return res.status(400).json({
        error: "Request body is required",
        details: "No task data provided",
      });
    }

    // Convert to array if single task
    const tasksArray = Array.isArray(tasksData) ? tasksData : [tasksData];
    console.log("tasksArray", tasksArray);

    // Validate each task has required fields
    const invalidTasks = tasksArray.filter(
      (task) => !task.project || !task.name
    );

    if (invalidTasks.length > 0) {
      return res.status(400).json({
        error: "Validation failed",
        details: "Each task must have projectId and taskName",
        invalidTasks: invalidTasks.map((t) => ({
          projectId: t.project,
          taskName: t.name,
        })),
      });
    }

    // Validate all tasks belong to same project
    const projectIds = [...new Set(tasksArray.map((task) => task.project))];
    if (projectIds.length !== 1) {
      return res.status(400).json({
        error: "Validation failed",
        details: "All tasks must belong to the same project",
        receivedProjects: projectIds,
      });
    }

    const projectId = projectIds[0];

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        error: "Not found",
        details: `Project with ID ${projectId} not found`,
      });
    }

    // Prepare tasks for creation
    const tasks = tasksArray.map((taskData) => ({
      project: taskData.project,
      name: taskData.name,
      description: taskData.description || "",
      assignedTo: taskData.assignedTo || [],
      status: taskData.status || "pending",
      startDate: taskData.startDate || null,
      dueDate: taskData.dueDate || null,
      percentage: taskData.percentage || "0%",
      createdBy: id,
    }));

    // Create tasks
    const savedTasks = await Task.insertMany(tasks);
    const taskIds = savedTasks.map((task) => task._id);

    // Update project with new task IDs
    await Project.findByIdAndUpdate(
      projectId,
      { $addToSet: { tasks: { $each: taskIds } } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message:
        tasksArray.length > 1
          ? `${tasksArray.length} tasks created successfully`
          : "Task created successfully",
      count: tasksArray.length,
      tasks: savedTasks,
      projectId: projectId,
    });
  } catch (error) {
    console.error("Task creation error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
// Update an existing task
const updateTask = async (req, res) => {
  console.log("updateTask");
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedTask = await Task.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updatedTask)
      return res.status(404).json({ message: "Task not found" });
    res
      .status(200)
      .json({ message: "Task updated successfully", task: updatedTask });
  } catch (error) {
    res.status(500).json({ message: "Failed to update task", error });
  }
};

// Delete a task
const deleteTask = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const task = await Task.findById(id).session(session);

    if (!task) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Task not found" });
    }

    // Delete the task
    const deletedTask = await Task.findByIdAndDelete(id).session(session);

    // Remove from project if exists
    if (task.project) {
      await Project.findByIdAndUpdate(
        task.project,
        { $pull: { tasks: id } },
        { new: true, session }
      );
    }

    await session.commitTransaction();
    res.status(200).json({ message: "Task deleted successfully", deletedTask });
  } catch (error) {
    await session.abortTransaction();
    res
      .status(500)
      .json({ message: "Failed to delete task", error: error.message });
  } finally {
    session.endSession();
  }
};

// Get all tasks
const getAllTasks = async (req, res) => {
  console.log("getAllTasks");
  try {
    const tasks = await Task.find()
      .populate("projectId")
      .populate("assignedTo");
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Failed to get tasks", error });
  }
};

// Get task by ID
const getTaskById = async (req, res) => {
  console.log("getTaskById");
  try {
    const { id } = req.params;
  console.log("id: ", id);
    const task = await Task.findById(id)
      .populate("project")
      .populate("assignedTo");

    if (!task) return res.status(404).json({ message: "Task not found" });
    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: "Failed to get task", error });
  }
};

// Get tasks by project ID
const getTasksByProjectId = async (req, res) => {
  console.log("Reached getTasksByProjectId handler");
  try {
    const project = req.params?.projectId || req.query?.projectId;

    if (!project) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const tasks = await Task.find({ project })
      .populate("assignedTo", "username email")
      .lean();

    // Return JUST the tasks array
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Task fetch error:", error);
    res.status(500).json({
      error: "Server error",
      message:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get tasks by status
const getTasksByStatus = async (req, res) => {
  console.log("getTasksByStatus");
  try {
    const { status } = req.params;
    const tasks = await Task.find({ status })
      .populate("projectId")
      .populate("assignedTo");

    if (!tasks || tasks.length === 0)
      return res
        .status(404)
        .json({ message: "No tasks found with this status" });
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Failed to get tasks by status", error });
  }
};

// Get tasks assigned to a specific user
const getTasksByAssignedUser = async (req, res) => {
  console.log("getTasksByAssignedUser");
  try {
    const { userId } = req.params;
    const tasks = await Task.find({ assignedTo: userId }).populate("projectId");

    if (!tasks || tasks.length === 0)
      return res.status(404).json({ message: "No tasks found for this user" });
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Failed to get tasks for user", error });
  }
};

module.exports = {
  createTasks,
  updateTask,
  deleteTask,
  getAllTasks,
  getTaskById,
  getTasksByProjectId,
  getTasksByStatus,
  getTasksByAssignedUser,
};
 