
require("dotenv").config();

const mongoose = require("mongoose");
const Payment = require("./models/Payment");

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: false,
    });

    const payment = await Payment.findOne({
      status: "success",
    }).select("orderId paymentId status signature");

    console.log({
      paymentFound: Boolean(payment),
      status: payment?.status,
      orderIdPresent: Boolean(payment?.orderId),
      paymentIdPresent: Boolean(payment?.paymentId),
      signatureStored: Boolean(payment?.signature),
    });
  } catch (error) {
    console.error(error.message);
  } finally {
    await mongoose.disconnect();
  }
}

check();
