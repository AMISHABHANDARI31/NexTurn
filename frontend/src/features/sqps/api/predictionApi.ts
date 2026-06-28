import { apiClient } from '../../../lib/http/apiClient'

export interface CorePrediction {
  locationId: string
  locationName: string
  estimatedWaitMinutes: number
  peopleAhead: number
  activeCounters: number
  queueLength: number
  averageServiceDurationMinutes: number
  backlogClearanceMinutes: number
  congestionFactor: number
  predictionConfidenceScore: number
  predictionConfidenceText: string
  predictionSource: string
  calculatedAt: string
}

export const predictionApi = {
  getCore: async (locationId: string, scope?: 'branch', tokenId?: string) => (await apiClient.get<{ success: boolean; data: CorePrediction }>(`/predict/core/${locationId}`, { params: { ...(scope ? { scope } : {}), ...(tokenId ? { tokenId } : {}) } })).data.data,
}
