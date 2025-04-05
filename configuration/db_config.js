const mongoose = require("mongoose");
const dotenv = require('dotenv');
const assignProjects = require("../seeds/seedProjects");
const assignProjectsToOrg = require("../seeds/assignProjectToOrga");
dotenv.config();

// Import models
const File = require("../models/file");
const Project = require("../models/project"); 
const User = require("../models/user"); 
const Organization = require("../models/organization");
const Task = require("../models/task");

const connectDB = async () => {
  try {
    // Register models before connecting
    mongoose.model("File", File.schema);
    mongoose.model("Project", Project.schema);
    mongoose.model("User", User.schema);
    mongoose.model("Organization", Organization.schema);
    mongoose.model("Task", Task.schema);

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB')

    // Optional: Seed data (uncomment if needed)
    // await assignProjects();
    // await assignProjectsToOrg();
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }
};

module.exports = connectDB;
