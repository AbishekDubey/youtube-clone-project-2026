import type {
  NextApiRequest,
  NextApiResponse,
} from "next";

import Razorpay from "razorpay";

type PlanName =
  | "Bronze"
  | "Silver"
  | "Gold";

type SuccessResponse = {
  success: true;
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  plan: PlanName;
};

type ErrorResponse = {
  success: false;
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed.",
    });
  }

  const keyId =
    process.env.RAZORPAY_KEY_ID;

  const keySecret =
    process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error(
      "Razorpay environment variables are missing."
    );

    return res.status(500).json({
      success: false,
      error:
        "Razorpay is not configured. Check .env.local.",
    });
  }

  try {
    const {
      plan,
      email,
    } = req.body;

    if (!isPaidPlan(plan)) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid membership plan.",
      });
    }

    if (
      typeof email !==
        "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        error:
          "User email is required.",
      });
    }

    const price =
      PLAN_PRICES[plan];

    /*
     * Razorpay expects the amount
     * in the smallest currency unit.
     *
     * ₹99 = 9900 paise
     */
    const amount =
      price * 100;

    const razorpay =
      new Razorpay({
        key_id: keyId,
        key_secret:
          keySecret,
      });

    const receipt =
      `yt_${Date.now()}`.slice(
        0,
        40
      );

    const order =
      await razorpay.orders.create(
        {
          amount,
          currency: "INR",
          receipt,
          notes: {
            plan,
            email:
              email.trim(),
            project:
              "youtube-clone",
          },
        }
      );

    if (!order?.id) {
      return res.status(500).json({
        success: false,
        error:
          "Razorpay did not return an order ID.",
      });
    }

    return res.status(200).json({
      success: true,
      keyId,
      orderId:
        order.id,
      amount,
      currency:
        "INR",
      plan,
    });
  } catch (error) {
    console.error(
      "Razorpay order creation failed:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Unable to create Razorpay order.",
    });
  }
}