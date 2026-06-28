import { useQuery } from '@tanstack/react-query'
import { queueApi } from '../api/queueApi'
export const useQueue = () => useQuery({ queryKey:['queue'], queryFn:queueApi.getQueue, refetchInterval:15_000 })
export const useTokens = () => useQuery({ queryKey:['tokens'], queryFn:queueApi.getTokens, refetchInterval:10_000 })
export const useNotifications = () => useQuery({ queryKey:['notifications'], queryFn:queueApi.getNotifications })
