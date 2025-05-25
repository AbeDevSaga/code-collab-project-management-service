const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema(
  {
    // Basic file information
    name: { type: String, required: true }, // Name of the file
    type: { type: String, enum: ["code", "document", "image", "other"], default: "document"}, // Type of file (code, document, image, other)
    path: { type: String, required: true }, // Path to the file in storage (e.g., S3 or local storage)
    size: { type: Number, default: 0 }, // Size of the file in bytes
    extension: { type: String }, // File extension (e.g., .js, .py, .txt)

    // Ownership and associations
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // User who created the file
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null }, // Project the file belongs to
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true }, // Organization the file belongs to

    // Shared users (array of users with access to the file)
    sharedWith: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // User with access
        role: { type: String, enum: ["viewer", "editor", "admin"], default: "viewer" }, // Permission level
        addedAt: { type: Date, default: Date.now }, // When the user was added
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Who added the user
      },
    ],

    // Version control and collaboration
    isVersionControlled: { type: Boolean, default: false }, // Whether the file is under version control (Git)
    gitRepository: { type: String, default: "" }, // Link to the Git repository (if applicable)
    currentBranch: { type: String, default: "main" }, // Current Git branch
    lastCommitHash: { type: String, default: "" }, // Last commit hash (for tracking changes)
    collaborators: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // User who collaborated
        lastActive: { type: Date, default: Date.now }, // Last time the user was active on the file
        edits: { type: Number, default: 0 }, // Number of edits made by the user
      },
    ],

    // Metadata
    created_at: { type: Date, default: Date.now }, // When the file was created
    updated_at: { type: Date, default: Date.now }, // When the file was last updated
    isDeleted: { type: Boolean, default: false }, // Soft delete flag
    deletedAt: { type: Date, default: null }, // When the file was deleted (if applicable)

    // File history (optional, for tracking changes)
    history: [
      {
        version: { type: String, required: true }, // Version number or commit hash
        changes: { type: String }, // Description of changes
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // User who made the changes
        updatedAt: { type: Date, default: Date.now }, // When the changes were made
      },
    ],

    // Tags and labels (optional, for organizing files)
    tags: [{ type: String }], // Tags for categorization (e.g., "backend", "frontend", "bugfix")
    labels: [{ type: String }], // Labels for status (e.g., "in-progress", "completed", "review")

    // Comments and discussions (optional, for collaboration)
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // User who commented
        comment: { type: String, required: true }, // The comment text
        createdAt: { type: Date, default: Date.now }, // When the comment was created
        replies: [
          {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // User who replied
            reply: { type: String, required: true }, // The reply text
            createdAt: { type: Date, default: Date.now }, // When the reply was created
          },
        ],
      },
    ],
  },
  { timestamps: true } // Automatically adds `createdAt` and `updatedAt` fields
);

module.exports = mongoose.model("File", FileSchema);