
const express = require("express");

const {
  subscribeToChannel,
  unsubscribeFromChannel,
  getChannelSubscriptionStatus,
  getMySubscriptions,
} = require("../controllers/subscriptionController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Get all channels subscribed to by the logged-in user
router.get("/mine", protect, getMySubscriptions);

// Get subscription status and subscriber count
// Login is optional for this route.
router.get(
  "/:channelId",
  protect.optional,
  getChannelSubscriptionStatus
);

// Subscribe
router.post("/:channelId", protect, subscribeToChannel);

// Unsubscribe
router.delete("/:channelId", protect, unsubscribeFromChannel);

module.exports = router;
