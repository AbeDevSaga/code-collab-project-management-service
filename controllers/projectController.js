const Project = require("../models/project.js");
const mongoose = require("mongoose");
const path = require('path');
const Organization = require("../models/organization.js");
const User = require("../models/user.js");
const { createFile } = require("./fileController");
const { 
  createProjectChatGroup, 
  syncChatGroupMembers, 
  deleteProjectChatGroup 
} = require("./chatGroupController.js");
const { emitUserAddedToProject, emitUserRemovedFromProject } = require("../middlewares/emitter.js");
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

// 1. Create a project (only Project Managers can create projects)
// const createProject = async (req, res) => {
//   console.log("createProject")
//   try {
//     const { name, description, organization, teamMembers } = req.body;
//     const files = req.files || [];
//     console.log("files: ", files)
//     const createdBy = req.user.id;

//     // Create the project
//     const project = new Project({
//       name,
//       description,
//       createdBy,
//       organization:organization,
//       teamMembers: JSON.parse(teamMembers)
//     });

//      // Process files
//     if (files.length > 0) {
//       const fileRecords = await Promise.all(
//         files.map(file => {
//           return createFile(
//             createdBy,
//             {
//               name: file.originalname,
//               type: 'document',
//               path: '/uploads',
//               extension: path.extname(file.originalname).substring(1),
//               size: file.size,
//               content: file.buffer.toString('base64'),
//               organization: organization
//             },
//             project._id
//           );
//         })
//       );
//       project.files = fileRecords.map(f => f._id);
//     }
//     await project.save();

//     res.status(201).json({ message: "Project created successfully", project });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Error creating project", error: error.message });
//   }
// };

// const createProject = async (req, res) => {
//   console.log("createProject");
//   try {
//     const { name, description, organization, teamMembers } = req.body;
//     const files = req.files || [];
//     console.log("Files received:", files);
    
//     const createdBy = req.user.id;

//     // Create the project
//     const project = new Project({
//       name,
//       description,
//       createdBy,
//       organization: organization,
//       teamMembers: JSON.parse(teamMembers)
//     });

//     // Process files
//     if (files.length > 0) {
//       console.log("Processing files...");
//       const fileRecords = await Promise.all(
//         files.map(file => {
//           const extension = path.extname(file.originalname).substring(1); // Now path is defined
          
//           return createFile(
//             createdBy,
//             {
//               name: file.originalname,
//               type: 'document',
//               path: '/uploads',
//               extension: extension,
//               size: file.size,
//               content: file.buffer.toString('base64'),
//               organization: organization
//             },
//             project._id
//           );
//         })
//       );
//       project.files = fileRecords.map(f => f._id);
//     }

//     await project.save();
//     res.status(201).json({ message: "Project created successfully", project });
//   } catch (error) {
//     console.error("Error in createProject:", error);
//     res.status(500).json({ 
//       message: "Error creating project", 
//       error: error.message 
//     });
//   }
// };

const createProject = async (req, res) => {
  console.log("createProject");
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, description, organization, teamMembers } = req.body;
    const files = req.files || [];
    console.log("Files received count:", files.length);
    
    const createdBy = req.user.id;
    const parsedTeamMembers = JSON.parse(teamMembers);

    // Debug: Show first file details
    if (files.length > 0) {
      console.log("First file details:", {
        name: files[0].originalname,
        size: files[0].size,
        type: files[0].mimetype
      });
    }

    // Create the project
    const project = new Project({
      name,
      description,
      createdBy,
      organization: organization,
      teamMembers: parsedTeamMembers
    });

    // Process files
    if (files.length > 0) {
      console.log("Starting file processing...");
      try {
        const fileRecords = await Promise.all(
          files.map(async (file, index) => {
            console.log(`Processing file ${index + 1}: ${file.originalname}`);
            
            const fileData = {
              name: file.originalname,
              type: 'document',
              path: '/uploads',
              extension: path.extname(file.originalname).substring(1),
              size: file.size,
              content: file.buffer.toString('base64'),
              organization: organization
            };

            console.log("Calling createFile with:", {
              name: fileData.name,
              size: fileData.size,
              org: fileData.organization
            });

            const result = await createFile(
              createdBy,
              fileData,
              project._id
            );

            console.log(`File ${index + 1} processed successfully`);
            return result;
          })
        );
        project.files = fileRecords.map(f => f._id);
      } catch (fileError) {
        console.error("Error processing files:", fileError);
        throw fileError;
      }
    }

    await project.save({session});
    console.log("Project saved successfully with files:", project.files);

    // Create chat group for the project
    const chatGroup = await createProjectChatGroup(project, session);
    console.log("Chat group created for project:", chatGroup._id);

     // Update users' projects array
    const teamMemberIds = parsedTeamMembers.map(member => member.user);
    if (teamMemberIds.length > 0) {
      console.log("Updating team members' projects arrays...");
      await User.updateMany(
        { _id: { $in: teamMemberIds } },
        { $addToSet: { projects: project._id } },
        { $addToSet: { chatGroups: chatGroup._id } },
        { session }
      );
      console.log("Team members updated successfully");
    }


    // Commit the transaction
    await session.commitTransaction();
    console.log("Transaction committed successfully");

    res.status(201).json({ 
      message: "Project created successfully", 
      project: {
        id: project._id,
        name: project.name,
        files: project.files, 
        chatGroupId: chatGroup._id
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Full error in createProject:", error);
    res.status(500).json({ 
      message: "Error creating project", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    session.endSession();
  }
};

// Add file to project
const addFileToProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const fileData = req.body;
    const createdBy = req.user.id;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const newFile = await createFile(
      createdBy,
      {
        ...fileData,
        organization: project.organization
      },
      projectId
    );

    // Add file reference to project
    project.files.push(newFile._id);
    await project.save();

    res.status(201).json({ 
      message: "File added to project successfully",
      file: newFile,
      project
    });
  } catch (error) {
    console.error("Error adding file to project:", error);
    res.status(500).json({ 
      message: "Error adding file to project", 
      error: error.message 
    });
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
  console.log("projectId: ", projectId)

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

// Get projects by user ID (projects where the user is a team member)
const getProjectsByUserId = async (req, res) => {
  console.log("getProjectsByUserId is called");
  try {
    const userId = req.params.id; // User ID from route parameter
    console.log("user id: ", userId)
    
    // Fetch projects where the user is in teamMembers array
    const projects = await Project.find({ 
      "teamMembers.user": userId 
    })
      .populate("organization", "name email website")
      .populate("createdBy", "username email")
      .populate("teamMembers.user", "username email role")
      .populate("files", "name size")
      .populate("tasks", "name status");

    // if (!projects || projects.length === 0) {
    //   return res.status(404).json({ 
    //     message: "No projects found for this user" 

    //   });
    // }

    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching user projects:", error.message);
    res.status(500).json({ 
      message: "Error fetching projects by user ID", 
      error: error.message 
    });
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
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const projectId = req.params.id; // Project ID from route parameter

    const project = await Project.findById(projectId);

    if (!project) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Project not found" });
    }

    // Delete the project chat group first
    await deleteProjectChatGroup(projectId, session);
    console.log("Project chat group deleted");

    // Remove project reference from users
    const teamMemberIds = project.teamMembers.map(member => member.user);
    if (teamMemberIds.length > 0) {
      await User.updateMany(
        { _id: { $in: teamMemberIds } },
        { $pull: { projects: projectId } },
        { $pull: { chatGroups: chatGroup._id } },
        { session }
      );
    }
    // Delete the project
    await project.remove({ session });

    await session.commitTransaction();

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    res
      .status(500)
      .json({ message: "Error deleting project", error: error.message });
  } finally {
    session.endSession();
  }
};

 // Add user to a project (e.g. by project admin or manager)
const addUserToProject = async (req, res) => {
  try {
    const projectId = req.params.id; // Project ID from the route
    const { userId, role,  addedBy } = req.body; // User to add, role, and who added them

    // Find the project
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user already exists in the teamMembers
    const userAlreadyExists = project.teamMembers.some(
      (member) => member.user.toString() === userId
    );

    if (userAlreadyExists) {
      return res
        .status(400)
        .json({ message: "User is already a member of this project" });
    }

    const userRole = role && role.trim() !== "" ? role : "Developer"; 

    // Add user to teamMembers
    project.teamMembers.push({
      user: userId,
      role: userRole,
      addedBy,
    });

    await project.save();

    //Emit event here if you're using Redis Pub/Sub, RabbitMQ, etc.
    emitUserAddedToProject({projectId, userId})

    res.status(200).json({ message: "User added to project", project });
  } catch (error) {
    console.error("Error adding user to project:", error);
    res.status(500).json({
      message: "Error adding user to project",
      error: error.message,
    });
  }
};
const addMultipleUsersToProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const { users, addedBy } = req.body;
    console.log("req body", {users, addedBy}, "projectID: ", projectId)

    if (!Array.isArray(users)) {
      return res.status(400).json({ message: "Users must be an array" });
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the project
      const project = await Project.findById(projectId).session(session);
      if (!project) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Project not found" });
      }

      // Filter out users that are already members
      const existingUserIds = project.teamMembers.map(member => 
        member.user.toString()
      );

      const newUsers = users.filter(
        user => !existingUserIds.includes(user.userId)
      );

      if (newUsers.length === 0) {
        await session.abortTransaction();
        return res.status(400).json({ 
          message: "All users are already members of this project" 
        });
      }

      // Prepare new team members
      const newTeamMembers = newUsers.map(user => ({
        user: user.userId,
        role: user.role && user.role.trim() !== "" ? user.role : "Developer",
        addedBy,
      }));

      // Add all new users to project
      project.teamMembers.push(...newTeamMembers);
      await project.save({ session });

      // Update each user's projects array
      const userUpdatePromises = newUsers.map(async (user) => {
        await User.findByIdAndUpdate(
          user.userId,
          { $addToSet: { projects: projectId } }, // $addToSet prevents duplicates
          { session }
        );
      });

      await Promise.all(userUpdatePromises);

       // Sync chat group members
      await syncChatGroupMembers(projectId, session);
      // Commit the transaction
      await session.commitTransaction();

      // Emit events for each added user if needed
      newUsers.forEach(user => {
        emitUserAddedToProject({ projectId, userId: user.userId });
      });

      res.status(200).json({ 
        message: `${newUsers.length} users added to project`,
        project,
        addedCount: newUsers.length,
        skippedCount: users.length - newUsers.length,
      });
    } catch (error) {
      // If any error occurs, abort the transaction
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("Error adding multiple users to project:", error);
    res.status(500).json({
      message: "Error adding users to project",
      error: error.message,
    });
  }
};

const removeUserFromProject = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await session.abortTransaction();
    const projectId = req.params.id; // Project ID from route
    const { userId } = req.body; // ID of user to remove

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const project = await Project.findById(projectId).session(session);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user is in the team
    const memberIndex = project.teamMembers.findIndex(
      (member) => member.user.toString() === userId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: "User not found in project team" });
    }

    // Remove the user
    project.teamMembers.splice(memberIndex, 1);
    await project.save({session});

     await User.findByIdAndUpdate(
      userId,
      { $pull: { projects: projectId } },
      { session }
    );

    // Sync chat group members
    await syncChatGroupMembers(projectId, session);
    await session.commitTransaction();

    // Emit event here if using message broker to notify user service
    emitUserRemovedFromProject({ projectId, userId });

    res.status(200).json({ message: "User removed from project", project });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error removing user from project:", error);
    res.status(500).json({
      message: "Error removing user from project",
      error: error.message,
    });
  }finally {
    session.endSession();
  }
};



module.exports = {
  fetchProjects,
  createProject,
  addFileToProject,
  getProjects,
  getProjectsByUserId,
  getProjectById,
  updateProject,
  deleteProject,
  addUserToProject,
  removeUserFromProject,
  addMultipleUsersToProject
};