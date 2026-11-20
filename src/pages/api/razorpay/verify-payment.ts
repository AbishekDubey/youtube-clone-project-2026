import type {
  NextApiRequest,
  NextApiResponse,
} from "next";

import crypto from "crypto";

import Razorpay from "razorpay";

type PlanName =
  | "Bronze"
  | "Silver"
  | "Gold";

type SuccessResponse = {
  success: true;
  verified: true;
  captured: true;
  plan: PlanName;
  paymentId: string;
  orderId: string;
};

type ErrorResponse = {
  success: false;
  verified: false;
  captured: false;
  error: string;
};

type ApiResponse =
  | SuccessResponse
  | ErrorResponse;

const PLAN_PRICES: Record<
  PlanName,
  number
> = {
  Bronze: 99,
  Silver: 199,
  Gold: 299,
};

const isPaidPlan = (
  value: unknown
): value is PlanName => {
  return (
    value === "Bronze" ||
    value === "Silver" ||
    value === "Gold"
  );
};

function createSignature(
  orderId: string,
  paymentId: string,
  secret: string
) {
  return crypto
    .createHmac(
      "sha256",
      secret
    )
    .update(
      `${orderId}|${paymentId}`
    )
    .digest("hex");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (
    req.method !==
    "POST"
  ) {
    return res.status(405).json({
      success: false,
      verified: false,
      captured: false,
      error:
        "Method not allowed.",
    });
  }

  const keyId =
    process.env.RAZORPAY_KEY_ID;

  const keySecret =
    process.env.RAZORPAY_KEY_SECRET;

  if (
    !keyId ||
    !keySecret
  ) {
    return res.status(500).json({
      success: false,
      verified: false,
      captured: false,
      error:
        "Razorpay is not configured. Check .env.local.",
    });
  }

  try {
    const {
      plan,
      orderId,
      paymentId,
      razorpayOrderId,
      signature,
    } = req.body;

    if (!isPaidPlan(plan)) {
      return res.status(400).json({
        success: false,
        verified: false,
        captured: false,
        error:
          "Invalid membership plan.",
      });
    }

    if (
      typeof orderId !==
        "string" ||
      !orderId.trim()
    ) {
      return res.status(400).json({
        success: false,
        verified: false,
        captured: false,
        error:
          "Server order ID is required.",
      });
    }

    if (
      typeof paymentId !==
        "string" ||
      !paymentId.trim()
    ) {
      return res.status(400).json({
        success: false,
        verified: false,
        captured: false,
        error:
          "Payment ID is required.",
      });
    }

    if (
      typeof razorpayOrderId !==
        "string" ||
      !razorpayOrderId.trim()
    ) {
      return res.status(400).json({
        success: false,
        verified: false,
        captured: false,
        error:
          "Razorpay order ID is required.",
      });
    }

    if (
      typeof signature !==
        "string" ||
      !signature.trim()
    ) {
      return res.status(400).json({
        success: false,
        verified: false,
        captured: false,
        error:
          "Payment signature is required.",
      });
    }

    /*
     * The order ID from our own
     * server must match the order
     * used by Checkout.
     */
    if (
      razorpayOrderId !==
      orderId
    ) {
      return res.status(400).json({
        success: false,
        verified: false,
        captured: false,
        error:
          "Razorpay order ID does not match the server order.",
      });
    }

    /*
     * Create expected signature
     * using the server-side secret.
     */
    const expectedSignature =
      createSignature(
        orderId,
        paymentId,
        keySecret
      );

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "utf8"
      );

    const receivedBuffer =
      Buffer.from(
        signature,
        "utf8"
      );

    if (
      expectedBuffer.length !==
      receivedBuffer.length
    ) {
      return res.status(400).json({
        success: false,
        verified: false,
        captured: false,
        error:
          "Invalid payment signature.",
      });
    }

    const signatureValid =
      crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
      );

    if (!signatureValid) {
      return res.status(400).json({
        success: false,
        verified: false,
        captured: false,
        error:
          "Payment signature verification failed.",
      });
    }

    const razorpay =
      new Razorpay({
        key_id: keyId,
        key_secret:
          keySecret,
      });

    /*
     * Fetch the order from Razorpay.
     */
    const order =
      await razorpay.orders.fetch(
        orderId
      );

    const expectedAmount =
      PLAN_PRICES[plan] *
      100;

    if (
      order.amount !==
      expectedAmount
    ) {
      return res.status(400).json({
        success: false,
        verified: false,
        captured: false,
        error:
          "Payment amount does not match the selected plan.",
      });
    }

    if (
      order.currency !==
      "INR"
    ) {
      return res.status(400).json({
        success: false,
        verified: false,
        captured: false,
        error:
          "Unexpected payment currency.",
      });
    }

    /*
     * Fetch the actual payment.
     */
    const payment =
      await razorpay.payments.fetch(
        paymentId
      );

    /*
     * Make sure this payment
     * belongs to the same order.
     */
    if (
      payment.order_id !==
      orderId
    ) {
      return res.status(400).json({
        success: false,
        verified: false,
        captured: false,
        error:
          "Payment does not belong to the expected order.",
      });
    }

    /*
     * Membership is activated only
     * after the payment is captured.
     */
    if (
      payment.status !==
      "captured"
    ) {
      return res.status(400).json({
        success: false,
        verified: false,
        captured: false,
        error:
          `Payment is not captured. Current status: ${payment.status}`,
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      captured: true,
      plan,
      paymentId,
      orderId,
    });
  } catch (error) {
    console.error(
      "Payment verification failed:",
      error
    );

    return res.status(500).json({
      success: false,
      verified: false,
      captured: false,
      error:
        "Unable to verify Razorpay payment.",
    });
  }
}