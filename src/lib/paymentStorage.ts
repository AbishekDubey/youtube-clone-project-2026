export type PaymentStatus =
  | "success"
  | "failed"
  | "pending"
  | "cancelled";

export type PaymentType =
  | "subscription"
  | "upgrade"
  | "downgrade"
  | "renewal";

export type PaymentPlan =
  | "Bronze"
  | "Silver"
  | "Gold";

export type PaymentRecord = {
  id: string;

  userId: string;

  plan: PaymentPlan;

  amount: number;

  currency: "INR";

  paymentId: string | null;

  orderId: string | null;

  status: PaymentStatus;

  type: PaymentType;

  createdAt: string;

  /*
   * Transaction / invoice details
   */
  invoiceNumber?: string;

  subscriptionStartDate?: string | null;

  subscriptionExpiryDate?: string | null;

  renewalDate?: string | null;

  autoRenew?: boolean;

  /*
   * Useful payment metadata
   */
  method?: string | null;

  failureReason?: string | null;

  notes?: string | null;

  updatedAt?: string;
};

const PAYMENT_KEY =
  "youtube_payment_records";

const INVOICE_PREFIX =
  "YTCLONE-INV";

function createPaymentId(
  prefix: string
) {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function createInvoiceNumber() {
  const year =
    new Date().getFullYear();

  return `${INVOICE_PREFIX}-${year}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;
}

function isPaymentStatus(
  value: unknown
): value is PaymentStatus {
  return (
    value === "success" ||
    value === "failed" ||
    value === "pending" ||
    value === "cancelled"
  );
}

function isPaymentType(
  value: unknown
): value is PaymentType {
  return (
    value === "subscription" ||
    value === "upgrade" ||
    value === "downgrade" ||
    value === "renewal"
  );
}

function isPaymentPlan(
  value: unknown
): value is PaymentPlan {
  return (
    value === "Bronze" ||
    value === "Silver" ||
    value === "Gold"
  );
}

function isValidPaymentRecord(
  value: unknown
): value is PaymentRecord {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const record =
    value as Partial<PaymentRecord>;

  return (
    typeof record.id ===
      "string" &&
    typeof record.userId ===
      "string" &&
    isPaymentPlan(
      record.plan
    ) &&
    typeof record.amount ===
      "number" &&
    record.currency ===
      "INR" &&
    (
      record.paymentId ===
        null ||
      typeof record.paymentId ===
        "string"
    ) &&
    (
      record.orderId ===
        null ||
      typeof record.orderId ===
        "string"
    ) &&
    isPaymentStatus(
      record.status
    ) &&
    isPaymentType(
      record.type
    ) &&
    typeof record.createdAt ===
      "string"
  );
}

function getStoredPayments(): PaymentRecord[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  try {
    const data =
      localStorage.getItem(
        PAYMENT_KEY
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
      isValidPaymentRecord
    );
  } catch (error) {
    console.error(
      "Failed to load payment history:",
      error
    );

    return [];
  }
}

function savePayments(
  payments: PaymentRecord[]
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  try {
    localStorage.setItem(
      PAYMENT_KEY,
      JSON.stringify(
        payments
      )
    );

    return true;
  } catch (error) {
    console.error(
      "Failed to save payment history:",
      error
    );

    return false;
  }
}

/*
 * Find an existing payment using
 * Razorpay payment ID.
 */
export function getPaymentByPaymentId(
  paymentId: string
) {
  if (!paymentId) {
    return undefined;
  }

  return getStoredPayments().find(
    (payment) =>
      payment.paymentId ===
      paymentId
  );
}

/*
 * Find an existing payment using
 * Razorpay order ID.
 */
export function getPaymentByOrderId(
  orderId: string
) {
  if (!orderId) {
    return undefined;
  }

  return getStoredPayments().find(
    (payment) =>
      payment.orderId ===
      orderId
  );
}

/*
 * Check whether a payment ID or order ID
 * has already been recorded.
 */
export function isDuplicatePayment(
  paymentId?: string | null,
  orderId?: string | null
) {
  const payments =
    getStoredPayments();

  return payments.some(
    (payment) =>
      (
        !!paymentId &&
        payment.paymentId ===
          paymentId
      ) ||
      (
        !!orderId &&
        payment.orderId ===
          orderId
      )
  );
}

/*
 * Create a verified payment record.
 *
 * Duplicate payment/order IDs are not
 * inserted again.
 */
export function createPaymentRecord(
  data: Omit<
    PaymentRecord,
    "id" | "createdAt"
  >
) {
  const payments =
    getStoredPayments();

  const existing =
    payments.find(
      (payment) =>
        (
          !!data.paymentId &&
          payment.paymentId ===
            data.paymentId
        ) ||
        (
          !!data.orderId &&
          payment.orderId ===
            data.orderId
        )
    );

  if (existing) {
    return existing;
  }

  const now =
    new Date().toISOString();

  const record: PaymentRecord =
    {
      ...data,

      id:
        createPaymentId(
          "payment"
        ),

      createdAt:
        now,

      invoiceNumber:
        data.invoiceNumber ??
        createInvoiceNumber(),

      updatedAt:
        now,
    };

  const saved =
    savePayments([
      record,
      ...payments,
    ]);

  if (!saved) {
    throw new Error(
      "Unable to save payment record."
    );
  }

  return record;
}

/*
 * Create a pending payment record.
 */
export function createPendingPaymentRecord(
  data: Omit<
    PaymentRecord,
    "id" |
      "createdAt" |
      "status"
  >
) {
  return createPaymentRecord({
    ...data,
    status:
      "pending",
  });
}

/*
 * Create a failed payment record.
 */
export function createFailedPaymentRecord(
  data: Omit<
    PaymentRecord,
    "id" |
      "createdAt" |
      "status"
  >
) {
  return createPaymentRecord({
    ...data,
    status:
      "failed",
  });
}

/*
 * Create a cancelled payment record.
 */
export function createCancelledPaymentRecord(
  data: Omit<
    PaymentRecord,
    "id" |
      "createdAt" |
      "status"
  >
) {
  return createPaymentRecord({
    ...data,
    status:
      "cancelled",
  });
}

/*
 * Update an existing payment record.
 */
export function updatePaymentRecord(
  paymentRecordId: string,
  updates: Partial<
    Omit<
      PaymentRecord,
      "id" | "createdAt"
    >
  >
) {
  const payments =
    getStoredPayments();

  const index =
    payments.findIndex(
      (payment) =>
        payment.id ===
        paymentRecordId
    );

  if (index === -1) {
    return undefined;
  }

  const existing =
    payments[index];

  const updated:
    PaymentRecord =
    {
      ...existing,
      ...updates,
      updatedAt:
        new Date().toISOString(),
    };

  payments[index] =
    updated;

  const saved =
    savePayments(
      payments
    );

  if (!saved) {
    throw new Error(
      "Unable to update payment record."
    );
  }

  return updated;
}

/*
 * Update a payment by Razorpay payment ID.
 */
export function updatePaymentByPaymentId(
  paymentId: string,
  updates: Partial<
    Omit<
      PaymentRecord,
      "id" | "createdAt"
    >
  >
) {
  const existing =
    getPaymentByPaymentId(
      paymentId
    );

  if (!existing) {
    return undefined;
  }

  return updatePaymentRecord(
    existing.id,
    updates
  );
}

/*
 * Update a payment by Razorpay order ID.
 */
export function updatePaymentByOrderId(
  orderId: string,
  updates: Partial<
    Omit<
      PaymentRecord,
      "id" | "createdAt"
    >
  >
) {
  const existing =
    getPaymentByOrderId(
      orderId
    );

  if (!existing) {
    return undefined;
  }

  return updatePaymentRecord(
    existing.id,
    updates
  );
}

/*
 * Get payment history for one user.
 */
export function getPaymentHistory(
  userId: string
) {
  return getStoredPayments()
    .filter(
      (payment) =>
        payment.userId ===
        userId
    )
    .sort(
      (a, b) =>
        new Date(
          b.createdAt
        ).getTime() -
        new Date(
          a.createdAt
        ).getTime()
    );
}

/*
 * Get all payment records.
 */
export function getAllPaymentRecords() {
  return getStoredPayments().sort(
    (a, b) =>
      new Date(
        b.createdAt
      ).getTime() -
      new Date(
        a.createdAt
      ).getTime()
  );
}

/*
 * Get one payment record.
 */
export function getPaymentRecord(
  paymentRecordId: string
) {
  return getStoredPayments().find(
    (payment) =>
      payment.id ===
      paymentRecordId
  );
}

/*
 * Get successful payments only.
 */
export function getSuccessfulPayments(
  userId: string
) {
  return getPaymentHistory(
    userId
  ).filter(
    (payment) =>
      payment.status ===
      "success"
  );
}

/*
 * Get failed payments.
 */
export function getFailedPayments(
  userId: string
) {
  return getPaymentHistory(
    userId
  ).filter(
    (payment) =>
      payment.status ===
      "failed"
  );
}

/*
 * Get cancelled payments.
 */
export function getCancelledPayments(
  userId: string
) {
  return getPaymentHistory(
    userId
  ).filter(
    (payment) =>
      payment.status ===
      "cancelled"
  );
}

/*
 * Get pending payments.
 */
export function getPendingPayments(
  userId: string
) {
  return getPaymentHistory(
    userId
  ).filter(
    (payment) =>
      payment.status ===
      "pending"
  );
}

/*
 * Clear payment history for one user.
 */
export function clearPaymentHistory(
  userId: string
) {
  const payments =
    getStoredPayments();

  const updated =
    payments.filter(
      (payment) =>
        payment.userId !==
        userId
    );

  savePayments(
    updated
  );
}

/*
 * Clear all payment records.
 * Useful only for local development/testing.
 */
export function clearAllPaymentRecords() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  localStorage.removeItem(
    PAYMENT_KEY
  );
}