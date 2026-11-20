
require("dotenv").config();

const mongoose = require("mongoose");
const Payment = require("./models/Payment");
const Subscription = require("./models/Subscription");

async function verifyDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: false,
    });

    const payments = await Payment.find({})
      .select("-signature")
      .sort({ createdAt: -1 })
      .lean();

    const subscriptions = await Subscription.find({})
      .lean();

    console.log("\n===== PAYMENT RECORDS =====");
    console.log(JSON.stringify(payments, null, 2));

    console.log("\n===== SUBSCRIPTION RECORDS =====");
    console.log(JSON.stringify(subscriptions, null, 2));
  } catch (error) {
    console.error("Database verification error:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

verifyDatabase();
