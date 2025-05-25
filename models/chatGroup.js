  const mongoose = require("mongoose");

const ChatGroupSchema = new mongoose.Schema(
  {
    // Basic chat info
    name: { type: String }, // Optional name for the chat group
    description: { type: String }, // Optional description
    isGroupChat: { type: Boolean, default: true }, // Whether it's a group chat or 1:1
    avatar: { type: String }, // URL to chat avatar/image
    
    // Association with organization and project (optional)
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" }, // If part of an org
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" }, // If part of a project
    
    // Chat participants
    participants: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        }, // Role in the chat
        joinedAt: { type: Date, default: Date.now },
        invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Who invited this user
        status: {
          type: String,
          enum: ["active", "pending", "rejected", "left"],
          default: "active",
        }, // Status of participation
      },
    ],
    
    // For invitation link chats
    isInvitationLinkChat: { type: Boolean, default: false }, // Whether created via invitation link
    invitationLink: { type: String }, // Unique invitation link token
    invitationLinkExpires: { type: Date }, // When the link expires (optional)
    invitationLinkCreator: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Who created the link
    
    // Chat settings
    isPublic: { type: Boolean, default: false }, // Whether anyone can join
    isArchived: { type: Boolean, default: false }, // Whether chat is archived
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" }, // Last message in chat
    
    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Who created the chat
  },
  { timestamps: true }
);

// Index for faster querying
ChatGroupSchema.index({ organization: 1, project: 1 });
ChatGroupSchema.index({ invitationLink: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("ChatGroup", ChatGroupSchema);