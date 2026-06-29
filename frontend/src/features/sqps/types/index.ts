export interface QueueSummary {
  location: string;
  service: string;
  waiting: number;
  estimatedMinutes: number;
  confidenceLow: number;
  confidenceHigh: number;
  updatedAt: string;
}
export interface Token {
  id: string;
  code: string;
  customer: string;
  service: string;
  waitMinutes: number;
  priority: "standard" | "priority";
  status: "waiting" | "serving" | "done" | "cancelled";
  cancelReason?: string | null;
  cancelledAt?: string | null;
}
export interface Notification {
  id: string;
  title: string;
  body: string;
  category: "queue" | "system" | "account";
  read: boolean;
  createdAt: string;
  href: string;
}
export interface ServiceLocation {
  _id: string;
  service: string;
  location: string;
  category: string;
  status: "Available" | "Busy" | "Unavailable";
  predictedWaitMinutes: number;
  activeCounters?: number;
  acceptsTokens?: boolean;
  tokenAvailabilityReason?: string;
  imageUrl?: string | null;
}
