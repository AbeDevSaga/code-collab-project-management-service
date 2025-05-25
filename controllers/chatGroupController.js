const ChatGroup = require("../models/chatGroup");
const Project = require("../models/project");
const User = require("../models/user");
const mongoose = require("mongoose");

// Create a chat group for a project
const createProjectChatGroup = async (project, session = null) => {
  try {
    const chatGroup = new ChatGroup({
      name: `Project: ${project.name}`,
      description: `Chat group for project ${project.name}`,
      isGroupChat: true,
      organization: project.organization,
      project: project._id,
      participants: project.teamMembers.map(member => ({
        user: member.user,
        role: member.role === "Admin" ? "admin" : "member",
        invitedBy: project.createdBy,
        status: "active"
      })),
      createdBy: project.createdBy,
      isPublic: false
    });

    const options = session ? { session } : {};
    await chatGroup.save(options);
    
    return chatGroup;
  } catch (error) {
    console.error("Error creating project chat group:", error);
    throw error;
  }
};

// Update chat group members when project team changes
const syncChatGroupMembers = async (projectId, session = null) => {
  try {
    // Find the project chat group
    const chatGroup = await ChatGroup.findOne({ project: projectId }).session(session || null);
    if (!chatGroup) {
      console.log("No chat group found for this project");
      return null;
    }

    // Find the project with current team members
    const project = await Project.findById(projectId)
      .populate("teamMembers.user")
      .session(session || null);

    if (!project) {
      throw new Error("Project not found");
    }

    // Get current participants and team members
    const currentParticipants = chatGroup.participants.map(p => p.user.toString());
    const currentTeamMembers = project.teamMembers.map(m => m.user.toString());

    // Add new team members to chat group
    const newMembers = project.teamMembers.filter(
      member => !currentParticipants.includes(member.user.toString())
    );

    if (newMembers.length > 0) {
      newMembers.forEach(member => {
        chatGroup.participants.push({
          user: member.user,
          role: member.role === "Admin" ? "admin" : "member",
          invitedBy: project.createdBy,
          status: "active"
        });
      });
    }

    // Remove users no longer in project team
    const participantsToRemove = chatGroup.participants.filter(
      participant => !currentTeamMembers.includes(participant.user.toString())
    );

    if (participantsToRemove.length > 0) {
      chatGroup.participants = chatGroup.participants.filter(
        participant => currentTeamMembers.includes(participant.user.toString())
      );
    }

    await chatGroup.save({ session });
    return chatGroup;
  } catch (error) {
    console.error("Error syncing chat group members:", error);
    throw error;
  }
};

// Delete project chat group
const deleteProjectChatGroup = async (projectId, session = null) => {
  try {
    const result = await ChatGroup.deleteOne({ project: projectId })
      .session(session || null);
    return result;
  } catch (error) {
    console.error("Error deleting project chat group:", error);
    throw error;
  }
};

module.exports = {
  createProjectChatGroup,
  syncChatGroupMembers,
  deleteProjectChatGroup
};