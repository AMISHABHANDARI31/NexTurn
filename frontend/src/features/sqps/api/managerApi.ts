import { apiClient } from '../../../lib/http/apiClient'

interface Envelope<T> { success: boolean; message?: string; data: T }
export interface BranchLocation { _id: string; location: string; category: string; activeCounters: number; businessHours: { openTime: string; closeTime: string }; defaultServiceMinutes: number; scheduleImageUrl?: string }
export interface Counter { _id: string; name: string; number: number; status: 'Active' | 'Break' | 'Closed'; lastStatusChangedAt: string }
export interface LiveToken { _id: string; code: string; service: string; category: string; priority: 'standard' | 'high'; status: 'waiting' | 'serving'; estimatedMinutes: number; createdAt: string; servingAt?: string; counter?: { name: string; number: number } }
export interface BranchService { locationId: string; service: string; category: string }
export interface ManagerAnalytics { completed: number; cancelled: number; counterSpeed: Array<{ counterId: string; counterName: string; completed: number; averageProcessingMinutes: number }>; hourlyVolume: Array<{ hour: number; customers: number }> }
export interface ManagerAlert { id: string; severity: 'critical' | 'warning'; title: string; message: string }

export const managerApi = {
  getCounters: async () => (await apiClient.get<Envelope<{ location: BranchLocation; counters: Counter[] }>>('/manager/counters')).data.data,
  updateCounterStatus: async (counterId: string, status: Counter['status']) => (await apiClient.patch(`/manager/counters/${counterId}/status`, { status })).data.data.counter as Counter,
  getLiveQueue: async () => (await apiClient.get<Envelope<{ tokens: LiveToken[]; services: BranchService[] }>>('/manager/queue/live')).data.data,
  callNext: async (counterId: string) => (await apiClient.post('/manager/queue/next', { counterId })).data.data.token as LiveToken,
  createWalkIn: async (input: { service: string; phone: string }) => (await apiClient.post('/manager/queue/walk-in', input)).data.data.token as LiveToken,
  updateTokenStatus: async (tokenId: string, status: 'completed' | 'cancelled') => (await apiClient.patch(`/manager/queue/tokens/${tokenId}/status`, { status })).data.data.token,
  getLocationSettings: async () => (await apiClient.get<Envelope<{ location: BranchLocation }>>('/manager/location/settings')).data.data.location,
  updateLocationSettings: async (formData: FormData) => (await apiClient.put('/manager/location/settings', formData)).data.data.location as BranchLocation,
  getAnalytics: async () => (await apiClient.get<Envelope<ManagerAnalytics>>('/manager/analytics/summary')).data.data,
  getNotifications: async () => (await apiClient.get<Envelope<{ waiting: number; baselineMinutes: number; alerts: ManagerAlert[] }>>('/manager/notifications')).data.data,
}
