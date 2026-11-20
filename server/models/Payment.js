
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ["Bronze", "Silver", "Gold"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    currency: {
      type: String,
      default: "INR",
      enum: ["INR"],
    },

    orderId: {
      type: String,
      required: true,
      unique: true,
    },

    paymentId: {
      type: String,
      unique: true,
      sparse: true,
    },

    signature: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "created",
        "pending",
        "success",
        "failed",
        "cancelled",
      ],
      default: "created",
    },

    type: {
      type: String,
      enum: [
        "subscription",
        "renewal",
        "upgrade",
        "downgrade",
      ],
      default: "subscription",
    },

    subscriptionStartDate: {
      type: Date,
      default: null,
    },

    subscriptionExpiryDate: {
      type: Date,
      default: null,
    },

    method: {
      type: String,
      default: "",
    },

    failureReason: {
      type: String,
      default: "",
    },

    // Verification recovery and processing fields.
    verificationAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    processingStartedAt: {
      type: Date,
      default: null,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    verificationError: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
