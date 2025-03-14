const mongoose = require("mongoose");
const dotenv = require('dotenv');
const assignProjects = require("../seeds/seedProjects");
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB')
    // await assignProjects();
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }
};

module.exports = connectDB;
