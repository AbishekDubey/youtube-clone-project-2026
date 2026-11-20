const mongoose = require("mongoose");

const moderationRecordSchema =
  new mongoose.Schema(
    {
      commentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        required: true,
        index: true,
      },

      moderatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      action: {
        type: String,
        enum: [
          "approved",
          "blocked",
          "reported",
          "deleted",
          "edited",
        ],
        required: true,
      },

      reason: {
        type: String,
        required: true,
        trim: true,
      },

      details: {
        type: String,
        default: "",
        trim: true,
      },
    },
    {
      timestamps: true,
    }
  );

moderationRecordSchema.index({
  commentId: 1,
  createdAt: -1,
});

module.exports =
  mongoose.model(
    "ModerationRecord",
    moderationRecordSchema
  );