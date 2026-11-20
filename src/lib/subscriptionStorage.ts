export type SubscriptionPlan =
  | "Free"
  | "Bronze"
  | "Silver"
  | "Gold";

export type SubscriptionStatus =
  | "active"
  | "expired"
  | "cancelled";

export type Subscription = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string | null;
  autoRenew: boolean;
  paymentId: string | null;
  orderId: string | null;
};

const MEMBERSHIP_KEY =
  "youtube_membership_subscription";

const CHANNEL_SUBSCRIPTIONS_KEY =
  "youtube_channel_subscriptions";

const PLAN_DETAILS: Record<
  SubscriptionPlan,
  {
    name: SubscriptionPlan;
    price: number;
    durationDays: number;
    downloadLimit: number;
    features: string[];
  }
> = {
  Free: {
    name: "Free",
    price: 0,
    durationDays: 0,
    downloadLimit: 1,
    features: [
      "Basic video access",
      "1 download per day",
      "Standard features",
    ],
  },

  Bronze: {
    name: "Bronze",
    price: 99,
    durationDays: 30,
    downloadLimit: 5,
    features: [
      "Unlimited video watching",
      "5 downloads per day",
      "Bronze membership",
    ],
  },

  Silver: {
    name: "Silver",
    price: 199,
    durationDays: 30,
    downloadLimit: 10,
    features: [
      "Unlimited video watching",
      "10 downloads per day",
      "Silver membership",
      "Priority features",
    ],
  },

  Gold: {
    name: "Gold",
    price: 299,
    durationDays: 30,
    downloadLimit: 20,
    features: [
      "Unlimited video watching",
      "20 downloads per day",
      "Gold membership",
      "All premium features",
    ],
  },
};

/* =========================================
   MEMBERSHIP STORAGE
========================================= */

function getStoredMembership():
  | Subscription
  | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const data =
      localStorage.getItem(
        MEMBERSHIP_KEY
      );

    if (!data) {
      return null;
    }

    const parsed =
      JSON.parse(data);

    if (
      !parsed ||
      typeof parsed !==
        "object"
    ) {
      return null;
    }

    return parsed as Subscription;
  } catch (error) {
    console.error(
      "Failed to load membership:",
      error
    );

    return null;
  }
}

function saveMembership(
  subscription: Subscription
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    localStorage.setItem(
      MEMBERSHIP_KEY,
      JSON.stringify(
        subscription
      )
    );
  } catch (error) {
    console.error(
      "Failed to save membership:",
      error
    );
  }
}

/* =========================================
   PLAN DETAILS
========================================= */

export function getPlanDetails(
  plan: SubscriptionPlan
) {
  return PLAN_DETAILS[
    plan
  ];
}

export function getAllPlans() {
  return Object.values(
    PLAN_DETAILS
  );
}

/* =========================================
   CURRENT MEMBERSHIP
========================================= */

export function getCurrentSubscription(): Subscription {
  const stored =
    getStoredMembership();

  if (!stored) {
    return {
      plan: "Free",
      status: "active",
      startedAt:
        new Date().toISOString(),
      expiresAt: null,
      autoRenew: false,
      paymentId: null,
      orderId: null,
    };
  }

  /*
   * Automatically downgrade an expired
   * paid subscription to Free.
   */
  if (
    stored.plan !== "Free" &&
    stored.expiresAt &&
    new Date(
      stored.expiresAt
    ).getTime() <= Date.now()
  ) {
    const expiredSubscription: Subscription =
      {
        ...stored,
        plan: "Free",
        status: "expired",
        autoRenew: false,
      };

    saveMembership(
      expiredSubscription
    );

    return expiredSubscription;
  }

  return stored;
}

/* =========================================
   EFFECTIVE SUBSCRIPTION
========================================= */

/*
 * Returns true when the current subscription
 * can use paid features.
 *
 * Free users are always allowed to use
 * Free-level features.
 */
export function canUsePaidFeatures() {
  const subscription =
    getCurrentSubscription();

  if (
    subscription.plan ===
    "Free"
  ) {
    return true;
  }

  if (
    subscription.status !==
      "active" &&
    subscription.status !==
      "cancelled"
  ) {
    return false;
  }

  if (
    !subscription.expiresAt
  ) {
    return false;
  }

  return (
    new Date(
      subscription.expiresAt
    ).getTime() >
    Date.now()
  );
}

/*
 * Returns the plan the application should
 * actually use for permissions and quotas.
 *
 * Example:
 *
 * Bronze + valid expiry
 * => Bronze
 *
 * Bronze + expired
 * => Free
 */
export function getEffectivePlan(): SubscriptionPlan {
  const subscription =
    getCurrentSubscription();

  if (
    subscription.plan ===
    "Free"
  ) {
    return "Free";
  }

  if (
    !canUsePaidFeatures()
  ) {
    return "Free";
  }

  return subscription.plan;
}

export function getCurrentPlan(): SubscriptionPlan {
  return getEffectivePlan();
}

/*
 * Compatibility export for
 * older download code.
 */
export function getSubscriptionPlan(): SubscriptionPlan {
  return getCurrentPlan();
}

export function isSubscriptionActive() {
  const subscription =
    getCurrentSubscription();

  if (
    subscription.plan ===
    "Free"
  ) {
    return true;
  }

  return (
    subscription.status ===
      "active" &&
    !!subscription.expiresAt &&
    new Date(
      subscription.expiresAt
    ).getTime() >
      Date.now()
  );
}

/*
 * Returns whether the current user has
 * a valid paid membership.
 */
export function hasActivePaidSubscription() {
  const subscription =
    getCurrentSubscription();

  if (
    subscription.plan ===
    "Free"
  ) {
    return false;
  }

  return (
    subscription.status ===
      "active" &&
    !!subscription.expiresAt &&
    new Date(
      subscription.expiresAt
    ).getTime() >
      Date.now()
  );
}

export function getSubscriptionDaysRemaining() {
  const subscription =
    getCurrentSubscription();

  if (
    !subscription.expiresAt
  ) {
    return null;
  }

  const remaining =
    new Date(
      subscription.expiresAt
    ).getTime() -
    Date.now();

  return Math.max(
    0,
    Math.ceil(
      remaining /
        (24 *
          60 *
          60 *
          1000)
    )
  );
}

export function getSubscriptionExpiryDate() {
  return getCurrentSubscription()
    .expiresAt;
}

export function getSubscriptionStatus(): SubscriptionStatus {
  return getCurrentSubscription()
    .status;
}

/* =========================================
   MEMBERSHIP ACTIONS
========================================= */

export function subscribeToPlan(
  plan: SubscriptionPlan,
  paymentId: string | null = null,
  orderId: string | null = null
) {
  if (
    plan === "Free"
  ) {
    const freeSubscription: Subscription =
      {
        plan: "Free",
        status: "active",
        startedAt:
          new Date().toISOString(),
        expiresAt: null,
        autoRenew: false,
        paymentId: null,
        orderId: null,
      };

    saveMembership(
      freeSubscription
    );

    return freeSubscription;
  }

  const startedAt =
    new Date();

  const expiresAt =
    new Date(
      startedAt.getTime() +
        PLAN_DETAILS[
          plan
        ].durationDays *
          24 *
          60 *
          60 *
          1000
    );

  const subscription: Subscription =
    {
      plan,
      status: "active",
      startedAt:
        startedAt.toISOString(),
      expiresAt:
        expiresAt.toISOString(),
      autoRenew: true,
      paymentId,
      orderId,
    };

  saveMembership(
    subscription
  );

  return subscription;
}

export function cancelSubscription() {
  const current =
    getCurrentSubscription();

  const updated: Subscription =
    {
      ...current,
      autoRenew: false,
      status:
        current.plan ===
        "Free"
          ? "active"
          : "cancelled",
    };

  saveMembership(
    updated
  );

  return updated;
}

export function renewSubscription(
  paymentId: string | null = null,
  orderId: string | null = null
) {
  const current =
    getCurrentSubscription();

  if (
    current.plan ===
    "Free"
  ) {
    return current;
  }

  return subscribeToPlan(
    current.plan,
    paymentId,
    orderId
  );
}

export function setSubscriptionPayment(
  paymentId: string,
  orderId: string
) {
  const current =
    getCurrentSubscription();

  const updated: Subscription =
    {
      ...current,
      paymentId,
      orderId,
    };

  saveMembership(
    updated
  );

  return updated;
}

export function getDownloadLimit(
  plan?: SubscriptionPlan
) {
  const currentPlan =
    plan ||
    getCurrentPlan();

  return PLAN_DETAILS[
    currentPlan
  ].downloadLimit;
}

/* =========================================
   CHANNEL SUBSCRIPTIONS
========================================= */

function getChannelSubscriptions(): string[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  try {
    const data =
      localStorage.getItem(
        CHANNEL_SUBSCRIPTIONS_KEY
      );

    if (!data) {
      return [];
    }

    const parsed =
      JSON.parse(data);

    if (
      !Array.isArray(parsed)
    ) {
      return [];
    }

    return parsed.filter(
      (
        channel
      ): channel is string =>
        typeof channel ===
          "string" &&
        channel.trim()
          .length > 0
    );
  } catch (error) {
    console.error(
      "Failed to load channel subscriptions:",
      error
    );

    return [];
  }
}

function saveChannelSubscriptions(
  channels: string[]
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    localStorage.setItem(
      CHANNEL_SUBSCRIPTIONS_KEY,
      JSON.stringify(
        channels
      )
    );
  } catch (error) {
    console.error(
      "Failed to save channel subscriptions:",
      error
    );
  }
}

/*
 * Returns all subscribed
 * channel names.
 */
export function getSubscriptions(): string[] {
  return getChannelSubscriptions();
}

/*
 * Alias for clearer naming.
 */
export function getSubscribedChannels(): string[] {
  return getChannelSubscriptions();
}

/*
 * Check whether a channel
 * is subscribed.
 */
export function isSubscribed(
  channelName: string
) {
  if (
    !channelName
  ) {
    return false;
  }

  return getChannelSubscriptions().includes(
    channelName
  );
}

/*
 * Subscribe / unsubscribe.
 *
 * Returns:
 * true  = subscribed
 * false = unsubscribed
 */
export function toggleSubscription(
  channelName: string
) {
  if (
    !channelName
  ) {
    return false;
  }

  const channels =
    getChannelSubscriptions();

  const exists =
    channels.includes(
      channelName
    );

  if (exists) {
    const updated =
      channels.filter(
        (channel) =>
          channel !==
          channelName
      );

    saveChannelSubscriptions(
      updated
    );

    return false;
  }

  saveChannelSubscriptions([
    ...channels,
    channelName,
  ]);

  return true;
}

/*
 * Subscribe directly.
 */
export function subscribeToChannel(
  channelName: string
) {
  if (
    !channelName
  ) {
    return false;
  }

  const channels =
    getChannelSubscriptions();

  if (
    channels.includes(
      channelName
    )
  ) {
    return true;
  }

  saveChannelSubscriptions([
    ...channels,
    channelName,
  ]);

  return true;
}

/*
 * Unsubscribe directly.
 */
export function unsubscribeFromChannel(
  channelName: string
) {
  if (
    !channelName
  ) {
    return false;
  }

  const channels =
    getChannelSubscriptions();

  saveChannelSubscriptions(
    channels.filter(
      (channel) =>
        channel !==
        channelName
    )
  );

  return true;
}

export function getSubscribedChannelCount() {
  return getChannelSubscriptions()
    .length;
}

/* =========================================
   RESET HELPERS
========================================= */

export function resetMembership() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  localStorage.removeItem(
    MEMBERSHIP_KEY
  );
}

export function resetChannelSubscriptions() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  localStorage.removeItem(
    CHANNEL_SUBSCRIPTIONS_KEY
  );
}