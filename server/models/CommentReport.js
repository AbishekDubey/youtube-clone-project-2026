
const mongoose = require("mongoose");

const commentReportSchema = new mongoose.Schema(
  {
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      required: true,
      index: true,
    },

    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    reason: {
      type: String,
      enum: ["spam", "harassment", "offensive"],
      required: true,
    },

    details: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "reviewed", "actioned", "dismissed"],
      default: "pending",
      index: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    adminNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    moderationAction: {
      type: String,
      enum: ["none", "warning", "hide_comment", "delete_comment"],
      default: "none",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate reports from the same user on the same comment.
commentReportSchema.index(
  { commentId: 1, reporterId: 1 },
  { unique: true }
);

commentReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("CommentReport", commentReportSchema);
