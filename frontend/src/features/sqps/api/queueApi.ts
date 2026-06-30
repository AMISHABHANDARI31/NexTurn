import { apiClient } from '../../../lib/http/apiClient'
import type { Notification, QueueSummary, ServiceLocation, Token } from '../types'
interface ApiEnvelope<T> { success: boolean; data: T; requestId?: string }
interface IssuedTokenResponse {
  tokenId: string
  code: string
  tokenNumber: string
  displayTokenNumber: string
  dailySequenceNumber: number
  date: string
  position: number
  estimatedWaitTime: string
  estimatedMinutes: number
  locationId: string
}
export const queueApi = { getLocations: async () => (await apiClient.get<ApiEnvelope<ServiceLocation[]>>('/locations')).data.data, getQueue: async () => (await apiClient.get<ApiEnvelope<QueueSummary>>('/queue')).data.data, getTokens: async () => (await apiClient.get<ApiEnvelope<Token[]>>('/tokens')).data.data, getNotifications: async () => (await apiClient.get<ApiEnvelope<Notification[]>>('/notifications')).data.data, requestToken: async (payload: { service: string; phone: string; accessibility: boolean }) => (await apiClient.post<ApiEnvelope<IssuedTokenResponse>>('/tokens', payload)).data.data, cancelToken: async (tokenId: string, reason: string) => (await apiClient.patch<ApiEnvelope<{ token: unknown }>>(`/tokens/${tokenId}/cancel`, { reason, cancelledBy: 'USER' })).data.data.token }
