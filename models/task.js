const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    // Basic Task Information
    name: { type: String, required: true }, // Name of the task
    description: { type: String }, // Description of the task
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "blocked"],
      default: "pending",
    }, // Task status
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    }, // Task priority

    // Task Ownership and Associations
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // User who created the task
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Users assigned to the task
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true }, // Project the task belongs to
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true }, // Organization the task belongs to

    // Task Timeline
    startDate: { type: Date }, // Task start date
    dueDate: { type: Date }, // Task due date
    completedAt: { type: Date }, // When the task was completed

    // Task Metadata
    tags: [{ type: String }], // Tags for categorization (e.g., "bug", "feature", "refactor")
    labels: [{ type: String }], // Labels for status (e.g., "high-priority", "low-priority")
    estimatedTime: { type: Number }, // Estimated time to complete the task (in hours)
    actualTime: { type: Number }, // Actual time spent on the task (in hours)

    // Task Collaboration
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // User who commented
        comment: { type: String, required: true }, // Comment text
        createdAt: { type: Date, default: Date.now }, // When the comment was created
      },
    ],
    attachments: [
      {
        name: { type: String, required: true }, // Name of the attachment
        url: { type: String, required: true }, // URL to the attachment
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // User who uploaded the attachment
        uploadedAt: { type: Date, default: Date.now }, // When the attachment was uploaded
      },
    ],

    // Task History
    history: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // User who made the change
        action: { type: String, required: true }, // Action performed (e.g., "status updated", "assigned to user")
        details: { type: String }, // Details of the change
        timestamp: { type: Date, default: Date.now }, // When the change was made
      },
    ],

    // Timestamps
    createdAt: { type: Date, default: Date.now }, // When the task was created
    updatedAt: { type: Date, default: Date.now }, // When the task was last updated
  },
  { timestamps: true } // Automatically adds `createdAt` and `updatedAt` fields
);

module.exports = mongoose.model("Task", TaskSchema);