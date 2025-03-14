const Project = require("../models/project.js");
const Organization = require("../models/organization.js");

//debug to fetch all projects
const fetchProjects = async (req, res) => {
  console.log("fetchProjects")
  try {
    const projects = await Project.find({})
      .populate("organization", "name email website")
      .populate("createdBy", "username email")
      .populate("teamMembers.user", "username email role")
      .populate("files", "name size")
      .populate("tasks", "name status"); // Populate tasks

    res.status(200).json(projects);
  } catch (error) {
    console.log("error:", error.message)
    res.status(500).json({ message: "Error fetching projects", error: error.message });
  }
};

// 1. Create a project (only super admins can create projects)
const createProject = async (req, res) => {
  console.log("createProject")
  try {
    const { name, description } = req.body;
    const createdBy = req.user._id;
    const organizationId = req.body.organizationId; // Organization ID from request body

    // Create the project
    const project = new Project({
      name,
      description,
      createdBy,
      organization: organizationId,
    });

    await project.save();

    res.status(201).json({ message: "Project created successfully", project });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating project", error: error.message });
  }
};

// 2. Get all projects in an organization
const getProjects = async (req, res) => {
  console.log("getProjects")
  try {
    const organizationId = req.params.id; // Organization ID from route parameter

    // Fetch all projects in the organization
    const projects = await Project.find({ organization: organizationId }).populate(
      "createdBy teamMembers.user files tasks"
    );

    res.status(200).json(projects);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching projects", error: error.message });
  }
};

// 3. Get a single project by ID
const getProjectById = async (req, res) => {
  console.log("getProjectById")
  try {
    const projectId = req.params.id; // Project ID from route parameter

    // Fetch the project
    const project = await Project.findById(projectId).populate(
      "organization createdBy teamMembers.user files tasks"
    );

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json(project );
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching project", error: error.message });
  }
};

// 4. Update a project (only super admins can update projects)
const updateProject = async (req, res) => {
  console.log("updateProject")
  try {
    const projectId = req.params.id; // Project ID from route parameter
    const { name, description, status } = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Update the project
    project.name = name || project.name;
    project.description = description || project.description;
    project.status = status || project.status;
    project.updatedAt = Date.now();

    await project.save();

    res.status(200).json({ message: "Project updated successfully", project });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating project", error: error.message });
  }
};

// 5. Delete a project (only super admins can delete projects)
const deleteProject = async (req, res) => {
  console.log("deleteProject")
  try {
    const projectId = req.params.id; // Project ID from route parameter

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Delete the project
    await project.remove();

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting project", error: error.message });
  }
};

module.exports = {
  fetchProjects,
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};