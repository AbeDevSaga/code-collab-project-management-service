const User = require("../models/user");
const Organization = require("../models/organization");
const Project = require("../models/project");
const { projects } = require("./constants"); // Import the projects constant

const assignProjects = async () => {
  try {
    // Fetch users and organizations from the database
    const users = await User.find();
    const organizations = await Organization.find();

    if (users.length === 0 || organizations.length === 0) {
      throw new Error("No users or organizations found in the database");
    }

    // Delete all existing projects
    await Project.deleteMany({});
    console.log("All existing projects deleted");
    
    // Assign 2 projects per organization
    const projectsWithAssignments = [];
    let projectIndex = 0;

    organizations.forEach((org) => {
      for (let i = 0; i < 2; i++) {
        if (projectIndex >= projects.length) break; // Stop if no more projects

        const randomUser = users[Math.floor(Math.random() * users.length)];

        projectsWithAssignments.push({
          ...projects[projectIndex],
          createdBy: randomUser._id, // Assign a random user as the creator
          organization: org._id, // Assign the current organization
          teamMembers: [
            {
              user: randomUser._id, // Add the creator as a team member
              role: "Admin", // Assign the admin role
              addedAt: new Date(),
              addedBy: randomUser._id,
            },
          ],
        });

        projectIndex++;
      }
    });

    // Insert projects into the database
    await Project.insertMany(projectsWithAssignments);
    console.log("Projects seeded successfully");
  } catch (error) {
    console.error("Error seeding projects:", error);
  }
};

module.exports = assignProjects;