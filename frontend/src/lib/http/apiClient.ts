import axios, { AxiosError } from 'axios'
import { auth } from '../auth/auth'

export interface ApiError { message: string; code?: string; requestId?: string; status?: number }
interface BackendErrorBody { message?: string; requestId?: string; error?: { code?: string; message?: string; requestId?: string; fields?: Record<string, string> } }

const productionApiBaseUrl = 'https://nexturn-8vta.onrender.com/api/v1/sqps'
const localApiBaseUrl = 'http://localhost:5000/api/v1/sqps'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? productionApiBaseUrl : localApiBaseUrl),
  timeout: 12_000,
})

apiClient.interceptors.request.use((config) => {
  const token = auth.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (!(config.data instanceof FormData)) config.headers['Content-Type'] = 'application/json'
  return config
})

apiClient.interceptors.response.use((response) => response, (error: AxiosError<BackendErrorBody>) => {
  const status = error.response?.status
  const body = error.response?.data
  const fieldMessages = body?.error?.fields ? Object.values(body.error.fields).filter(Boolean).join(' ') : ''
  const fallback = !error.response ? 'We could not reach NexTurn. Check that the backend is running.' : status === 401 ? 'Your session has expired. Please sign in again.' : status === 403 ? 'You do not have permission to perform this action.' : status && status >= 500 ? 'NexTurn is having trouble right now. Please try again shortly.' : 'Something went wrong. Please try again.'
  return Promise.reject({ message: fieldMessages || body?.error?.message || body?.message || fallback, code: body?.error?.code, requestId: body?.error?.requestId || body?.requestId || error.response?.headers['x-request-id'], status } satisfies ApiError)
})
