
const mongoose = require("mongoose");
const User = require("../models/User");
const Subscription = require("../models/Subscription");

// Subscribe to a channel
const subscribeToChannel = async (req, res) => {
  try {
    const subscriberId = req.user._id;
    const { channelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid channel ID",
      });
    }

    if (subscriberId.toString() === channelId) {
      return res.status(400).json({
        success: false,
        message: "You cannot subscribe to your own channel",
      });
    }

    const channel = await User.findById(channelId).select("_id name");

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Channel not found",
      });
    }

    await Subscription.updateOne(
      {
        subscriberId,
        channelId,
      },
      {
        $setOnInsert: {
          subscriberId,
          channelId,
        },
      },
      {
        upsert: true,
      }
    );

    const subscriberCount = await Subscription.countDocuments({
      channelId,
    });

    return res.status(200).json({
      success: true,
      isSubscribed: true,
      subscriberCount,
      message: "Subscribed successfully",
    });
  } catch (error) {
    console.error("Subscribe error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to subscribe",
    });
  }
};

// Unsubscribe from a channel
const unsubscribeFromChannel = async (req, res) => {
  try {
    const subscriberId = req.user._id;
    const { channelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid channel ID",
      });
    }

    const result = await Subscription.deleteOne({
      subscriberId,
      channelId,
    });

    const subscriberCount = await Subscription.countDocuments({
      channelId,
    });

    return res.status(200).json({
      success: true,
      isSubscribed: false,
      subscriberCount,
      message: result.deletedCount
        ? "Unsubscribed successfully"
        : "You were not subscribed to this channel",
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to unsubscribe",
    });
  }
};

// Get subscription status and subscriber count
const getChannelSubscriptionStatus = async (req, res) => {
  try {
    const { channelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid channel ID",
      });
    }

    const channelExists = await User.exists({
      _id: channelId,
    });

    if (!channelExists) {
      return res.status(404).json({
        success: false,
        message: "Channel not found",
      });
    }

    const subscriberCount = await Subscription.countDocuments({
      channelId,
    });

    let isSubscribed = false;

    if (req.user?._id) {
      isSubscribed = Boolean(
        await Subscription.exists({
          subscriberId: req.user._id,
          channelId,
        })
      );
    }

    return res.status(200).json({
      success: true,
      isSubscribed,
      subscriberCount,
    });
  } catch (error) {
    console.error("Subscription status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscription status",
    });
  }
};

// Get channels subscribed to by the logged-in user
const getMySubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({
      subscriberId: req.user._id,
    })
      .populate("channelId", "name email avatar")
      .sort({ createdAt: -1 });

    const channels = subscriptions
      .filter((item) => item.channelId)
      .map((item) => ({
        _id: item.channelId._id,
        name: item.channelId.name,
        email: item.channelId.email,
        avatar: item.channelId.avatar || "",
        subscribedAt: item.createdAt,
      }));

    return res.status(200).json({
      success: true,
      count: channels.length,
      channels,
    });
  } catch (error) {
    console.error("My subscriptions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your subscriptions",
    });
  }
};

module.exports = {
  subscribeToChannel,
  unsubscribeFromChannel,
  getChannelSubscriptionStatus,
  getMySubscriptions,
};
