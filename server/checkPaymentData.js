
require("dotenv").config();

const mongoose = require("mongoose");
const Payment = require("./models/Payment");

async function checkPaymentData() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: false,
    });

    const collection = Payment.collection;

    const indexes = await collection.indexes();

    const statusCounts = await collection
      .aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const nullPaymentIdCount = await collection.countDocuments({
      paymentId: { $type: 10 },
    });

    const missingPaymentIdCount = await collection.countDocuments({
      paymentId: { $exists: false },
    });

    console.log("\n========== PAYMENT DATABASE CHECK ==========\n");

    console.log(
      JSON.stringify(
        {
          indexes: indexes.map((index) => ({
            name: index.name,
            key: index.key,
            unique: !!index.unique,
            sparse: !!index.sparse,
            partialFilterExpression:
              index.partialFilterExpression || null,
          })),
          statusCounts,
          nullPaymentIdCount,
          missingPaymentIdCount,
        },
        null,
        2
      )
    );

    console.log("\n========== CHECK COMPLETED ==========\n");
  } catch (error) {
    console.error("Diagnostic error:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkPaymentData();
