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
  status: "waiting" | "serving" | "done";
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
  imageUrl?: string | null;
}
