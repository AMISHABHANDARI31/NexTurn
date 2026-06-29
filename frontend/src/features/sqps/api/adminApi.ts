import { apiClient } from '../../../lib/http/apiClient'

export type ManagedRole = 'User' | 'Manager' | 'SystemAdmin'
export interface ManagedUser { id: string; name: string; email: string; role: ManagedRole; assignedLocationId: string | null; isEmailVerified: boolean; isBootstrapAdmin: boolean; createdAt: string }
export interface AssignableLocation { id: string; name: string; category: string }
export interface ManagedBranch { id: string; name: string; branchCode: string; address: string; city: string; state: string; contactNumber: string; branchStatus: 'ACTIVE' | 'INACTIVE'; category: string; services: string[]; managers: ManagedUser[]; counters: number; activeCounters: number; createdAt: string; updatedAt: string }
export interface Telemetry { totalUsers: number; totalLocations: number; tokensIssuedToday: number }
export interface PredictionMetrics { totalPredictions: number; averageError: number; mae: number; rmse: number; accuracyPercentage: number }
export interface ModelStatus {
  modelVersion: string
  modelType: string
  trainedAt: string | null
  congestionFactor: number
  sampleSize: number
  metrics: PredictionMetrics
  todayMetrics: PredictionMetrics
  accuracyHistory: Array<PredictionMetrics & { date: string; scope: string; modelVersion: string }>
  previousVersion: { version: string; metrics: PredictionMetrics; trainedAt: string } | null
  training: { status: 'idle' | 'running' | 'completed' | 'failed'; startedAt: string | null; completedAt: string | null; output: string; error: string | null }
}
export interface PredictionAccuracy {
  summary: PredictionMetrics
  comparisons: Array<{ tokenId: string; serviceType: string; predictedWaitTime: number; actualWaitTime: number; predictionError: number; absoluteError: number; completedAt: string }>
}
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
  assignManager: async (id: string, assignedLocationId: string) => (await apiClient.patch<ApiEnvelope<{ user: ManagedUser }>>(`/admin/users/${id}/assignment`, { assignedLocationId })).data.data.user,
  removeManagerAssignment: async (id: string) => (await apiClient.delete<ApiEnvelope<{ user: ManagedUser }>>(`/admin/users/${id}/assignment`)).data.data.user,
  getAssignableLocations: async () => (await apiClient.get<ApiEnvelope<{ locations: AssignableLocation[] }>>('/admin/locations')).data.data.locations,
  getBranches: async () => (await apiClient.get<ApiEnvelope<{ branches: ManagedBranch[] }>>('/admin/branches')).data.data.branches,
  updateBranch: async (id: string, payload: Partial<Pick<ManagedBranch, 'name' | 'branchCode' | 'address' | 'city' | 'state' | 'contactNumber' | 'branchStatus'>>) => (await apiClient.patch<ApiEnvelope<{ branch: ManagedBranch }>>(`/admin/branches/${id}`, payload)).data.data.branch,
  createLocation: async (formData: FormData) => (await apiClient.post('/admin/locations', formData)).data.data.location,
  getModelStatus: async () => (await apiClient.get<ApiEnvelope<ModelStatus>>('/admin/model')).data.data,
  getPredictionAccuracy: async () => (await apiClient.get<ApiEnvelope<PredictionAccuracy>>('/admin/model/accuracy')).data.data,
  triggerRetraining: async () => (await apiClient.post('/admin/model/retrain')).data.data,
  updateCongestionFactor: async (congestionFactor: number) => (await apiClient.patch('/admin/model/config', { congestionFactor })).data.data,
  getAnalytics: async () => (await apiClient.get<ApiEnvelope<AnalyticsCharts>>('/admin/analytics/charts')).data.data,
}
