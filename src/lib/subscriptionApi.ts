
import { getBackendToken } from "@/lib/backendAuth";

const API_URL = "http://localhost:5000/api/subscriptions";

export type SubscriptionStatusResponse = {
  success: boolean;
  isSubscribed: boolean;
  subscriberCount: number;
  message?: string;
};

export type SubscribedChannel = {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  subscribedAt: string;
};

export type MySubscriptionsResponse = {
  success: boolean;
  count: number;
  channels: SubscribedChannel[];
};

async function subscriptionRequest<T>(
  endpoint: string,
  method: string = "GET"
): Promise<T> {
  const token = getBackendToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || "Subscription request failed"
    );
  }

  return data as T;
}

export function getChannelSubscriptionStatus(
  channelId: string
): Promise<SubscriptionStatusResponse> {
  return subscriptionRequest(
    `/${encodeURIComponent(channelId)}`
  );
}

export function subscribeToChannel(
  channelId: string
): Promise<SubscriptionStatusResponse> {
  return subscriptionRequest(
    `/${encodeURIComponent(channelId)}`,
    "POST"
  );
}

export function unsubscribeFromChannel(
  channelId: string
): Promise<SubscriptionStatusResponse> {
  return subscriptionRequest(
    `/${encodeURIComponent(channelId)}`,
    "DELETE"
  );
}

export function getMySubscriptions(): Promise<MySubscriptionsResponse> {
  return subscriptionRequest("/mine");
}
