
const crypto = require("crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");

const Payment = require("../models/Payment");
const Subscription = require("../models/Subscription");

const PLAN_PRICES = {
  Bronze: 99,
  Silver: 199,
  Gold: 299,
};

const PLAN_DURATION_DAYS = 30;

const getRazorpay = () => {
  if (
    !process.env.RAZORPAY_KEY_ID ||
    !process.env.RAZORPAY_KEY_SECRET
  ) {
    throw new Error("Razorpay environment variables are missing.");
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// 1. Create Razorpay order.
exports.createOrder = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!PLAN_PRICES[plan]) {
      return res.status(400).json({
        success: false,
        message: "Invalid membership plan.",
      });
    }

    const userId = req.user._id.toString();
    const razorpay = getRazorpay();

    const order = await razorpay.orders.create({
      amount: PLAN_PRICES[plan] * 100,
      currency: "INR",
      receipt: `sub_${Date.now()}`,
      notes: {
        userId,
        plan,
        project: "youtube-clone",
      },
    });

    await Payment.create({
      user: userId,
      plan,
      amount: PLAN_PRICES[plan],
      currency: "INR",
      orderId: order.id,
      status: "created",
      type: "subscription",
    });

    return res.status(201).json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan,
    });
  } catch (error) {
    console.error("Create order error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create payment order.",
    });
  }
};

// 2. Verify successful payment.
exports.verifyPayment = async (req, res) => {
  let session;

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are incomplete.",
      });
    }

    if (
      typeof razorpay_signature !== "string" ||
      !/^[a-f0-9]{64}$/i.test(razorpay_signature)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature format.",
      });
    }

    const userId = req.user._id.toString();

    const paymentRecord = await Payment.findOne({
      orderId: razorpay_order_id,
      user: userId,
    });

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found.",
      });
    }

    if (paymentRecord.status === "success") {
      if (paymentRecord.paymentId !== razorpay_payment_id) {
        return res.status(409).json({
          success: false,
          message: "This order has already been processed.",
        });
      }

      return res.status(200).json({
        success: true,
        verified: true,
        alreadyProcessed: true,
        message: "This payment has already been processed.",
      });
    }

    if (paymentRecord.status === "pending") {
      return res.status(409).json({
        success: false,
        message: "Payment requires reconciliation.",
      });
    }

    if (paymentRecord.status !== "created") {
      return res.status(409).json({
        success: false,
        message: "Payment order is not available.",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(razorpay_signature, "hex");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature.",
      });
    }

    const razorpay = getRazorpay();

    const [order, razorpayPayment] = await Promise.all([
      razorpay.orders.fetch(razorpay_order_id),
      razorpay.payments.fetch(razorpay_payment_id),
    ]);

    if (
      order.id !== paymentRecord.orderId ||
      order.amount !== paymentRecord.amount * 100 ||
      order.currency !== paymentRecord.currency ||
      order.notes?.userId !== userId ||
      order.notes?.plan !== paymentRecord.plan
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment order details do not match.",
      });
    }

    // Correct variable: razorpayPayment, not capturedPayment.
    if (
      razorpayPayment.order_id !== razorpay_order_id ||
      razorpayPayment.amount !== paymentRecord.amount * 100 ||
      razorpayPayment.currency !== paymentRecord.currency ||
      razorpayPayment.status !== "captured"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment is not captured or details are invalid.",
      });
    }

    session = await mongoose.startSession();

    let result = null;

    await session.withTransaction(async () => {
      const currentPayment = await Payment.findOne({
        _id: paymentRecord._id,
        user: userId,
      }).session(session);

      if (!currentPayment) {
        throw new Error("PAYMENT_RECORD_NOT_FOUND");
      }

      if (currentPayment.status === "success") {
        if (currentPayment.paymentId !== razorpay_payment_id) {
          throw new Error("ORDER_ALREADY_PROCESSED");
        }

        result = { alreadyProcessed: true };
        return;
      }

      if (currentPayment.status !== "created") {
        throw new Error("PAYMENT_NOT_PROCESSABLE");
      }

      const duplicatePayment = await Payment.findOne({
        paymentId: razorpay_payment_id,
        _id: { $ne: currentPayment._id },
      }).session(session);

      if (duplicatePayment) {
        throw new Error("PAYMENT_ID_ALREADY_USED");
      }

      const now = new Date();

      let subscription = await Subscription.findOne({
        user: userId,
      }).session(session);

      const existingExpiry =
        subscription?.expiresAt &&
        subscription.expiresAt > now
          ? subscription.expiresAt
          : now;

      const startDate = existingExpiry;
      const expiryDate = addDays(
        existingExpiry,
        PLAN_DURATION_DAYS
      );

      if (!subscription) {
        const created = await Subscription.create(
          [
            {
              user: userId,
              plan: currentPayment.plan,
              status: "active",
              startedAt: startDate,
              expiresAt: expiryDate,
              autoRenew: false,
              cancelledAt: null,
              lastPayment: currentPayment._id,
            },
          ],
          { session }
        );

        subscription = created[0];
      } else {
        subscription.plan = currentPayment.plan;
        subscription.status = "active";
        subscription.startedAt = startDate;
        subscription.expiresAt = expiryDate;
        subscription.autoRenew = false;
        subscription.cancelledAt = null;
        subscription.lastPayment = currentPayment._id;

        await subscription.save({ session });
      }

      currentPayment.paymentId = razorpay_payment_id;
      currentPayment.signature = razorpay_signature;
      currentPayment.method = razorpayPayment.method || "";
      currentPayment.status = "success";
      currentPayment.subscriptionStartDate = startDate;
      currentPayment.subscriptionExpiryDate = expiryDate;
      currentPayment.processingStartedAt = now;
      currentPayment.processedAt = now;
      currentPayment.verificationAttempts += 1;
      currentPayment.verificationError = "";
      currentPayment.failureReason = "";

      await currentPayment.save({ session });

      result = {
        alreadyProcessed: false,
        subscription: {
          plan: subscription.plan,
          status: subscription.status,
          startedAt: subscription.startedAt,
          expiresAt: subscription.expiresAt,
          autoRenew: subscription.autoRenew,
        },
      };
    });

    if (result?.alreadyProcessed) {
      return res.status(200).json({
        success: true,
        verified: true,
        alreadyProcessed: true,
        message: "This payment has already been processed.",
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      captured: true,
      message: "Payment verified and membership activated.",
      subscription: result.subscription,
    });
  } catch (error) {
    console.error("Verify payment error:", error.message);

    const conflicts = [
      "ORDER_ALREADY_PROCESSED",
      "PAYMENT_NOT_PROCESSABLE",
      "PAYMENT_ID_ALREADY_USED",
    ];

    if (conflicts.includes(error.message)) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "PAYMENT_RECORD_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Payment record not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Payment verification could not be completed.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// 3. Record failed payment attempt.
// The order remains created so the customer can retry checkout.
exports.recordPaymentFailure = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      code,
      description,
      reason,
    } = req.body;

    if (!razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required.",
      });
    }

    const payment = await Payment.findOne({
      orderId: razorpay_order_id,
      user: req.user._id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found.",
      });
    }

    if (payment.status === "success") {
      return res.status(409).json({
        success: false,
        message: "This payment has already succeeded.",
      });
    }

    if (payment.status !== "created") {
      return res.status(409).json({
        success: false,
        message: "This order cannot accept another attempt.",
      });
    }

    const safeDetails = [
      code,
      description,
      reason,
      razorpay_payment_id,
    ]
      .filter((value) => typeof value === "string")
      .map((value) => value.slice(0, 200));

    payment.failureReason = safeDetails.join(" | ").slice(0, 800);

    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Failed attempt recorded. You can retry checkout.",
    });
  } catch (error) {
    console.error("Payment failure record error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to record failed payment attempt.",
    });
  }
};

// 4. Get membership.
exports.getSubscription = async (req, res) => {
  try {
    const userId = req.user._id;

    let subscription = await Subscription.findOne({
      user: userId,
    });

    if (!subscription) {
      return res.status(200).json({
        success: true,
        subscription: {
          plan: "Free",
          status: "active",
          startedAt: null,
          expiresAt: null,
          autoRenew: false,
        },
      });
    }

    if (
      subscription.plan !== "Free" &&
      subscription.expiresAt &&
      subscription.expiresAt <= new Date() &&
      subscription.status !== "expired"
    ) {
      subscription.status = "expired";
      subscription.plan = "Free";
      subscription.autoRenew = false;

      await subscription.save();
    }

    return res.status(200).json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error("Get subscription error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve membership.",
    });
  }
};

// 5. Get payment history.
exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .select("-signature");

    return res.status(200).json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error("Payment history error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve payment history.",
    });
  }
};

// 6. Cancel auto-renewal.
exports.cancelAutoRenewal = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user._id,
    });

    if (!subscription || subscription.plan === "Free") {
      return res.status(404).json({
        success: false,
        message: "No paid membership found.",
      });
    }

    if (
      !subscription.expiresAt ||
      subscription.expiresAt <= new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Membership has already expired.",
      });
    }

    subscription.autoRenew = false;
    subscription.status = "cancelled";
    subscription.cancelledAt = new Date();

    await subscription.save();

    return res.status(200).json({
      success: true,
      message:
        "Auto-renewal disabled. Membership remains valid until expiry.",
      subscription,
    });
  } catch (error) {
    console.error("Cancel subscription error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel auto-renewal.",
    });
  }
};
