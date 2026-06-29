import { useQuery } from '@tanstack/react-query'
import { queueApi } from '../api/queueApi'
export const useQueue = () => useQuery({ queryKey:['queue'], queryFn:queueApi.getQueue })
export const useTokens = () => useQuery({ queryKey:['tokens'], queryFn:queueApi.getTokens })
export const useNotifications = () => useQuery({ queryKey:['notifications'], queryFn:queueApi.getNotifications })
