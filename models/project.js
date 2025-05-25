const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Name of the project
    description: { type: String }, // Description of the project
    status: {
      type: String,
      enum: ["active", "inactive", "completed", "archived"],
      default: "active",
    }, // Project status

    // Ownership and associations
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // User who created the project
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true }, // Organization the project belongs to

    // Team members and roles
    teamMembers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // User who is part of the team
        role: {
          type: String,
          enum: ["Admin", "Developer", "Member"],
          default: "Developer",
        }, // Role of the user in the project
        addedAt: { type: Date, default: Date.now }, // When the user was added to the project
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Who added the user to the project
      },
    ],

    // Chat Groups associated with the project
    //chatGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Chat" }],

    // Files associated with the project
    files: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }], // Files uploaded to the project

    // Tasks associated with the project
    tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }], // Tasks created for the project

    // Metadata
    createdAt: { type: Date, default: Date.now }, // When the project was created
    updatedAt: { type: Date, default: Date.now }, // When the project was last updated
    startDate: { type: Date }, // Project start date
    endDate: { type: Date }, // Project end date

    // Tags and labels (optional, for organizing projects)
    tags: [{ type: String }], // Tags for categorization (e.g., "web", "mobile", "backend")
    labels: [{ type: String }], // Labels for status (e.g., "high-priority", "low-priority")

    // Project settings (optional)
    isPublic: { type: Boolean, default: false }, // Whether the project is public or private
    allowExternalContributors: { type: Boolean, default: false }, // Whether external users can contribute
  },
  { timestamps: true } // Automatically adds `createdAt` and `updatedAt` fields
);

module.exports = mongoose.model("Project", ProjectSchema);