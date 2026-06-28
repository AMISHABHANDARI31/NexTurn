import { apiClient } from '../../../lib/http/apiClient'

export type ManagedRole = 'User' | 'Manager' | 'SystemAdmin'
export interface ManagedUser { id: string; name: string; email: string; role: ManagedRole; assignedLocationId: string | null; isEmailVerified: boolean; isBootstrapAdmin: boolean; createdAt: string }
export interface AssignableLocation { id: string; name: string; category: string }
export interface Telemetry { totalUsers: number; totalLocations: number; tokensIssuedToday: number }
export interface ModelStatus { modelVersion: string; congestionFactor: number; meanAbsoluteError: number; sampleSize: number; training: { status: 'idle' | 'running' | 'completed' | 'failed'; startedAt: string | null; completedAt: string | null; output: string; error: string | null } }
export interface AnalyticsCharts {
  peakRushHours: Array<{ hour: number; tokens: number; averageWaitMinutes: number }>
  weeklyTraffic: Array<{ dayOfWeek: number; tokens: number }>
  sectorEfficiency: Array<{ category: string; tokens: number; averageProcessingMinutes: number }>
}
interface ApiEnvelope<T> { success: boolean; message?: string; data: T }

export const adminApi = {
  getTelemetry: async () => (await apiClient.get<ApiEnvelope<Telemetry>>('/admin/telemetry')).data.data,
  getUsers: async () => (await apiClient.get<ApiEnvelope<{ users: ManagedUser[] }>>('/admin/users')).data.data.users,
  updateRole: async (id: string, role: 'User' | 'Manager', assignedLocationId?: string) => (await apiClient.patch<ApiEnvelope<{ user: ManagedUser }>>(`/admin/users/${id}/role`, { role, assignedLocationId })).data.data.user,
  getAssignableLocations: async () => (await apiClient.get<ApiEnvelope<{ locations: AssignableLocation[] }>>('/admin/locations')).data.data.locations,
  createLocation: async (formData: FormData) => (await apiClient.post('/admin/locations', formData)).data.data.location,
  getModelStatus: async () => (await apiClient.get<ApiEnvelope<ModelStatus>>('/admin/model')).data.data,
  triggerRetraining: async () => (await apiClient.post('/admin/model/retrain')).data.data,
  updateCongestionFactor: async (congestionFactor: number) => (await apiClient.patch('/admin/model/config', { congestionFactor })).data.data,
  getAnalytics: async () => (await apiClient.get<ApiEnvelope<AnalyticsCharts>>('/admin/analytics/charts')).data.data,
}
