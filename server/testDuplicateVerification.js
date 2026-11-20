
require("dotenv").config();

const mongoose = require("mongoose");
const Payment = require("./models/Payment");
const Subscription = require("./models/Subscription");
const paymentController = require("./controllers/paymentController");

async function testDuplicateVerification() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: false,
    });

    const payment = await Payment.findOne({
      status: "success",
    });

    if (!payment) {
      throw new Error("No successful payment found.");
    }

    const before = await Subscription.findOne({
      user: payment.user,
    }).lean();

    let responseStatus;
    let responseData;

    const req = {
      user: { _id: payment.user },
      body: {
        razorpay_order_id: payment.orderId,
        razorpay_payment_id: payment.paymentId,
        razorpay_signature: payment.signature,
      },
    };

    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    await paymentController.verifyPayment(req, res);

    const after = await Subscription.findOne({
      user: payment.user,
    }).lean();

    console.log("\n===== DUPLICATE VERIFICATION TEST =====");

    console.log({
      httpStatus: responseStatus,
      response: responseData,
      expiryBefore: before?.expiresAt,
      expiryAfter: after?.expiresAt,
      expiryUnchanged:
        before?.expiresAt?.getTime() ===
        after?.expiresAt?.getTime(),
    });
  } catch (error) {
    console.error("Test error:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testDuplicateVerification();
