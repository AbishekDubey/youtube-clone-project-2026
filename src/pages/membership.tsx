
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/router";

import {
  Check,
  Crown,
  CreditCard,
  Clock3,
  ShieldCheck,
  Sparkles,
  Download,
  Receipt,
  RefreshCw,
} from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

import { getCurrentUser } from "@/lib/auth";
import { getBackendToken } from "@/lib/backendAuth";

import {
  getAllPlans,
  getPlanDetails,
  type SubscriptionPlan,
} from "@/lib/subscriptionStorage";

type MembershipData = {
  plan: SubscriptionPlan;
  status: "active" | "expired" | "cancelled";
  startedAt: string | null;
  expiresAt: string | null;
  autoRenew: boolean;
};

type PaymentData = {
  _id: string;
  plan: string;
  amount: number;
  currency: string;
  paymentId?: string | null;
  orderId: string;
  status: string;
  type: string;
  createdAt: string;
  subscriptionStartDate?: string | null;
  subscriptionExpiryDate?: string | null;
};

type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error: {
    code?: string;
    description?: string;
    reason?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
  };
  theme?: {
    color?: string;
  };
  handler?: (
    response: RazorpayPaymentResponse
  ) => void | Promise<void>;
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: (response: RazorpayFailureResponse) => void
  ) => void;
};

declare global {
  interface Window {
    Razorpay?: new (
      options: RazorpayOptions
    ) => RazorpayInstance;
  }
}

const API_URL = "https://youtube-clone-project-2026.onrender.com/api/payments";

export default function MembershipPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  const [subscription, setSubscription] =
    useState<MembershipData | null>(null);

  const [payments, setPayments] =
    useState<PaymentData[]>([]);

  const [selectedPlan, setSelectedPlan] =
    useState<SubscriptionPlan | null>(null);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const plans = useMemo(() => getAllPlans(), []);

  const getAuthHeaders = () => {
    const token = getBackendToken();

    if (!token) {
      throw new Error(
        "Your login session has expired. Please login again."
      );
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  // Load membership and payment history from MongoDB.
  const refreshData = async () => {
    const headers = getAuthHeaders();

    const [subscriptionResponse, paymentResponse] =
      await Promise.all([
        fetch(`${API_URL}/subscription`, {
          method: "GET",
          headers,
        }),
        fetch(`${API_URL}/history`, {
          method: "GET",
          headers,
        }),
      ]);

    const subscriptionData = await subscriptionResponse.json();
    const paymentData = await paymentResponse.json();

    if (!subscriptionResponse.ok || !subscriptionData.success) {
      throw new Error(
        subscriptionData.message || "Unable to load membership."
      );
    }

    if (!paymentResponse.ok || !paymentData.success) {
      throw new Error(
        paymentData.message || "Unable to load payment history."
      );
    }

    const raw = subscriptionData.subscription;

    setSubscription({
      plan: raw.plan,
      status: raw.status,
      startedAt: raw.startedAt || null,
      expiresAt: raw.expiresAt || null,
      autoRenew: Boolean(raw.autoRenew),
    });

    setPayments(paymentData.payments || []);
  };

  useEffect(() => {
    if (!router.isReady) return;

    const user = getCurrentUser();
    const token = getBackendToken();

    if (!user || !token) {
      router.replace(
        `/login?returnUrl=${encodeURIComponent("/membership")}`
      );
      return;
    }

    setUserEmail(user.email);
    setUserName(user.name);

    const initialize = async () => {
      try {
        await refreshData();
      } catch (err) {
        console.error("Membership loading error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load membership."
        );
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [router.isReady]);

  // Load Razorpay Checkout.
  useEffect(() => {
    if (typeof window === "undefined" || window.Razorpay) {
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) return;

    const script = document.createElement("script");

    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  const getDaysRemaining = () => {
    if (!subscription?.expiresAt) return null;

    const difference =
      new Date(subscription.expiresAt).getTime() - Date.now();

    return Math.max(
      0,
      Math.ceil(difference / (1000 * 60 * 60 * 24))
    );
  };

  const isPaidAccessValid = () => {
    return Boolean(
      subscription &&
      subscription.plan !== "Free" &&
      subscription.expiresAt &&
      new Date(subscription.expiresAt).getTime() > Date.now()
    );
  };

  // Cancel renewal without removing the remaining paid access.
  const handleCancel = async () => {
    if (!subscription || !isPaidAccessValid()) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel auto-renewal? Your paid access will remain available until its expiry date."
    );

    if (!confirmed) return;

    try {
      setProcessing(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/cancel-renewal`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to cancel renewal."
        );
      }

      await refreshData();

      setMessage(
        "Auto-renewal is disabled. Your paid membership remains available until expiry."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to cancel renewal."
      );
    } finally {
      setProcessing(false);
    }
  };

  // Free plan is the default for users without a paid membership.
  const handleFreePlan = async () => {
    if (isPaidAccessValid()) {
      setMessage(
        "To stop future renewal, use Cancel auto-renewal. Your current paid access will remain until expiry."
      );
      return;
    }

    setMessage("You are already eligible for the Free plan.");
  };

  // Verify successful payment through the authenticated backend.
  const verifyPayment = async (
    paymentResponse: RazorpayPaymentResponse
  ) => {
    try {
      setError("");
      setMessage("Payment received. Verifying your payment...");

      const response = await fetch(
        `${API_URL}/verify-payment`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            razorpay_order_id:
              paymentResponse.razorpay_order_id,

            razorpay_payment_id:
              paymentResponse.razorpay_payment_id,

            razorpay_signature:
              paymentResponse.razorpay_signature,
          }),
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.verified
      ) {
        throw new Error(
          data.message || "Payment verification failed."
        );
      }

      // Membership is refreshed only from the backend.
      await refreshData();

      setSelectedPlan(null);

      setMessage(
        data.alreadyProcessed
          ? "This payment was already processed. Your membership has been refreshed."
          : "Payment verified successfully. Your membership has been activated."
      );
    } catch (err) {
      console.error("Payment verification error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Payment verification failed. Please contact support with your Razorpay payment ID."
      );
    } finally {
      setProcessing(false);
    }
  };

  // Record failed payment details through the backend.
  const recordPaymentFailure = async (
    orderId: string,
    failureResponse: RazorpayFailureResponse
  ) => {
    try {
      const failure = failureResponse.error;

      const response = await fetch(
        `${API_URL}/payment-failure`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            razorpay_order_id: orderId,
            razorpay_payment_id:
              failure.metadata?.payment_id || "",
            code: failure.code || "",
            description: failure.description || "",
            reason: failure.reason || "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to record payment failure."
        );
      }

      await refreshData();

      setError(
        failure.description ||
        "Payment failed. Please try again."
      );

      setMessage("");
    } catch (err) {
      console.error("Failed payment recording error:", err);

      setError(
        "Payment failed. Your membership was not activated. Please check your payment history before retrying."
      );
      setMessage("");
    } finally {
      setProcessing(false);
      setSelectedPlan(null);
    }
  };

  // Create an authenticated order through Express.
  const startRazorpayPayment = async (
    plan: SubscriptionPlan
  ) => {
    try {
      setProcessing(true);
      setSelectedPlan(plan);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/create-order`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ plan }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to create payment order."
        );
      }

      if (
        typeof data.keyId !== "string" ||
        typeof data.orderId !== "string" ||
        typeof data.amount !== "number"
      ) {
        throw new Error("Invalid payment order response.");
      }

      if (typeof window.Razorpay !== "function") {
        throw new Error(
          "Razorpay Checkout is still loading. Please try again."
        );
      }

      const options: RazorpayOptions = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || "INR",
        name: "YouTube Clone",
        description: `${plan} Membership`,
        order_id: data.orderId,

        prefill: {
          name: userName,
          email: userEmail,
        },

        theme: {
          color: "#000000",
        },

        handler: async (paymentResponse) => {
          await verifyPayment(paymentResponse);
        },

        modal: {
          ondismiss: () => {
            setProcessing(false);
            setSelectedPlan(null);

            setMessage(
              "Checkout closed. No membership was activated."
            );
          },
        },
      };

      const checkout = new window.Razorpay(options);

      // Handle Razorpay payment.failed event.
      checkout.on(
        "payment.failed",
        (failureResponse) => {
          void recordPaymentFailure(
            data.orderId,
            failureResponse
          );
        }
      );

      checkout.open();
    } catch (err) {
      console.error("Razorpay checkout error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start payment."
      );

      setProcessing(false);
      setSelectedPlan(null);
    }
  };

  const handlePlanClick = async (
    plan: SubscriptionPlan
  ) => {
    setError("");
    setMessage("");

    if (plan === "Free") {
      await handleFreePlan();
      return;
    }

    if (
      subscription?.plan === plan &&
      isPaidAccessValid()
    ) {
      setMessage("This is already your current membership plan.");
      return;
    }

    await startRazorpayPayment(plan);
  };

  const handleRenew = async () => {
    if (!subscription || !isPaidAccessValid()) {
      setMessage("There is no active paid membership to renew.");
      return;
    }

    await startRazorpayPayment(subscription.plan);
  };

  const daysRemaining = getDaysRemaining();

  if (
    !router.isReady ||
    loading ||
    !subscription
  ) {
    return (
      <main className="min-h-screen bg-white text-black">
        <Header
          onMenuClick={() => setSidebarOpen((prev) => !prev)}
        />

        <div className="flex min-h-screen items-center justify-center pt-16">
          <p className="text-sm text-gray-500">
            Loading membership...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <Header
        onMenuClick={() => setSidebarOpen((prev) => !prev)}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <MobileNav />

      <section
        className={`min-h-screen pt-16 transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : ""
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">

          {/* Heading */}
          <div>
            <div className="flex items-center gap-3">
              <Crown size={30} />

              <h1 className="text-2xl font-bold sm:text-3xl">
                Membership Plans
              </h1>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Choose a plan for enhanced video and download features.
            </p>
          </div>

          {/* Current Membership */}
          <section className="mt-7 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500">
                    Current plan
                  </span>

                  <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                    {subscription.plan}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      subscription.status === "active"
                        ? "bg-green-50 text-green-700"
                        : subscription.status === "expired"
                        ? "bg-red-50 text-red-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    {subscription.status}
                  </span>
                </div>

                <h2 className="mt-3 text-xl font-bold">
                  {getPlanDetails(subscription.plan).name}
                </h2>

                {subscription.expiresAt ? (
                  <>
                    <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                      <Clock3 size={15} />
                      {daysRemaining} days remaining
                    </p>

                    <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
                      <p>
                        Started:{" "}
                        {subscription.startedAt
                          ? new Date(subscription.startedAt).toLocaleDateString()
                          : "—"}
                      </p>

                      <p>
                        Expires:{" "}
                        {new Date(subscription.expiresAt).toLocaleDateString()}
                      </p>
                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                      Auto-renewal: Disabled
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">
                    No expiry on Free plan
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {isPaidAccessValid() && (
                  <>
                    <button
                      type="button"
                      onClick={handleRenew}
                      disabled={processing}
                      className="flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:bg-gray-400"
                    >
                      <RefreshCw size={17} />
                      Renew
                    </button>

                    {subscription.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={processing}
                        className="rounded-full bg-gray-100 px-5 py-2.5 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                      >
                        Cancel auto-renewal
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Messages */}
          {message && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Membership Plans */}
          <section className="mt-8">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => {
                const planName = plan.name as SubscriptionPlan;

                const active =
                  subscription.plan === planName &&
                  isPaidAccessValid();

                return (
                  <article
                    key={plan.name}
                    className={`relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition ${
                      active
                        ? "border-black ring-2 ring-black"
                        : "border-gray-200 hover:-translate-y-1 hover:shadow-md"
                    }`}
                  >
                    {active && (
                      <span className="absolute right-4 top-4 rounded-full bg-black px-3 py-1 text-[10px] font-semibold text-white">
                        CURRENT
                      </span>
                    )}

                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
                      {plan.name === "Gold" ? (
                        <Sparkles size={22} />
                      ) : (
                        <Crown size={22} />
                      )}
                    </div>

                    <h3 className="mt-5 text-xl font-bold">
                      {plan.name}
                    </h3>

                    <div className="mt-3 flex items-end gap-1">
                      <span className="text-3xl font-bold">
                        ₹{plan.price}
                      </span>

                      {plan.price > 0 && (
                        <span className="pb-1 text-sm text-gray-500">
                          /month
                        </span>
                      )}
                    </div>

                    <div className="mt-4 rounded-xl bg-gray-50 p-3">
                      <p className="text-sm font-semibold">
                        {plan.downloadLimit} downloads/day
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {plan.durationDays > 0
                          ? `${plan.durationDays} days validity`
                          : "No expiry on Free plan"}
                      </p>
                    </div>

                    <div className="mt-5 space-y-3">
                      {plan.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex gap-2 text-sm text-gray-600"
                        >
                          <Check
                            size={17}
                            className="mt-0.5 shrink-0"
                          />

                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto pt-7">
                      <button
                        type="button"
                        disabled={processing || active}
                        onClick={() => handlePlanClick(planName)}
                        className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${
                          active
                            ? "cursor-not-allowed bg-gray-200 text-gray-500"
                            : "bg-black text-white hover:bg-gray-800 disabled:bg-gray-400"
                        }`}
                      >
                        {processing && selectedPlan === planName ? (
                          <>
                            <CreditCard
                              size={17}
                              className="animate-pulse"
                            />
                            Processing...
                          </>
                        ) : active ? (
                          <>
                            <Check size={17} />
                            Current plan
                          </>
                        ) : planName === "Free" ? (
                          "Choose Free"
                        ) : (
                          <>
                            <CreditCard size={17} />
                            {subscription.plan === "Free"
                              ? "Subscribe"
                              : "Change plan"}
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Payment History */}
          <section className="mt-10">
            <div className="flex items-center gap-2">
              <Receipt size={22} />

              <h2 className="text-xl font-bold">
                Payment history
              </h2>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              Your payment records retrieved from your account.
            </p>

            {payments.length > 0 ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200">
                <div className="hidden grid-cols-7 gap-4 bg-gray-50 px-5 py-3 text-xs font-semibold text-gray-500 md:grid">
                  <span>Date</span>
                  <span>Plan</span>
                  <span>Type</span>
                  <span>Amount</span>
                  <span>Status</span>
                  <span>Payment ID</span>
                  <span>Order ID</span>
                </div>

                <div className="divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <div
                      key={payment._id}
                      className="grid gap-2 px-5 py-4 md:grid-cols-7 md:gap-4"
                    >
                      <div className="text-sm">
                        <span className="md:hidden">Date: </span>
                        {new Date(payment.createdAt).toLocaleString()}
                      </div>

                      <div className="text-sm font-semibold">
                        <span className="font-normal md:hidden">
                          Plan:{" "}
                        </span>
                        {payment.plan}
                      </div>

                      <div className="text-sm capitalize">
                        <span className="font-normal md:hidden">
                          Type:{" "}
                        </span>
                        {payment.type}
                      </div>

                      <div className="text-sm">
                        <span className="font-normal md:hidden">
                          Amount:{" "}
                        </span>
                        ₹{payment.amount}
                      </div>

                      <div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            payment.status === "success"
                              ? "bg-green-50 text-green-700"
                              : payment.status === "failed"
                              ? "bg-red-50 text-red-700"
                              : "bg-yellow-50 text-yellow-700"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </div>

                      <div className="truncate text-xs text-gray-500">
                        <span className="md:hidden">
                          Payment ID:{" "}
                        </span>
                        {payment.paymentId || "—"}
                      </div>

                      <div className="truncate text-xs text-gray-500">
                        <span className="md:hidden">
                          Order ID:{" "}
                        </span>
                        {payment.orderId}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-gray-300 p-10 text-center">
                <Receipt
                  size={40}
                  className="mx-auto text-gray-300"
                />

                <p className="mt-3 text-sm font-medium text-gray-500">
                  No payments yet
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Successful membership payments will appear here.
                </p>
              </div>
            )}
          </section>

          {/* Information Cards */}
          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <InfoCard
              icon={<CreditCard size={22} />}
              title="Razorpay checkout"
              text="Paid plans use Razorpay Standard Checkout."
            />

            <InfoCard
              icon={<ShieldCheck size={22} />}
              title="Server verification"
              text="Payment signatures, order ownership, amount and captured status are checked by the backend."
            />

            <InfoCard
              icon={<Download size={22} />}
              title="Download benefits"
              text="Your membership plan determines the download benefits available in the app."
            />
          </section>
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 p-5">
      <div className="text-black">{icon}</div>

      <h3 className="mt-3 font-semibold">{title}</h3>

      <p className="mt-1 text-xs leading-5 text-gray-500">
        {text}
      </p>
    </div>
  );
}
