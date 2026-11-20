
const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    subscriberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// One user can subscribe to a channel only once.
subscriptionSchema.index(
  { subscriberId: 1, channelId: 1 },
  { unique: true }
);

// Quickly find all subscribers of a channel.
subscriptionSchema.index({ channelId: 1 });

// Quickly find all channels subscribed to by a user.
subscriptionSchema.index({ subscriberId: 1 });

module.exports = mongoose.model(
  "Subscription",
  subscriptionSchema
);
