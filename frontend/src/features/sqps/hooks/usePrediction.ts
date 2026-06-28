import { useQuery } from '@tanstack/react-query'
import { predictionApi } from '../api/predictionApi'

export function usePrediction(locationId?: string | null, scope?: 'branch', tokenId?: string | null) {
  return useQuery({
    queryKey: ['prediction-core', locationId, scope, tokenId],
    queryFn: () => predictionApi.getCore(locationId!, scope, tokenId ?? undefined),
    enabled: Boolean(locationId),
    refetchInterval: 3_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 1_000,
  })
}
