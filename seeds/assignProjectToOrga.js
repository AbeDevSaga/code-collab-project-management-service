const Organization = require("../models/organization");
const Project = require("../models/project");

const assignProjectsToOrg = async () => {
  try {
    // Fetch all projects
    const projects = await Project.find();

    for (const project of projects) {
      const orgId = project.organization;

      if (!orgId) continue;

      const organization = await Organization.findById(orgId);

      if (!organization) continue;

      // Check if the project is already in the org.projects array
      const alreadyExists = organization.projects.some(
        (projId) => projId.toString() === project._id.toString()
      );

      if (!alreadyExists) {
        organization.projects.push(project._id);
        await organization.save();
        console.log(`Added project ${project._id} to organization ${orgId}`);
      }
    }

    console.log("Project assignment to organizations completed.");
  } catch (error) {
    console.error("Error assigning projects to organizations:", error);
  }
};

module.exports = assignProjectsToOrg;
