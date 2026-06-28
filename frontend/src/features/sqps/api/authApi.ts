import { apiClient } from '../../../lib/http/apiClient'
import type { Session } from '../../../lib/auth/auth'

interface AuthPayload {
  token: string
  user: Session
}

export interface RegistrationPending {
  requiresVerification: true
  email: string
  expiresInMinutes: number
}

interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

export const authApi = {
  async register(input: { name: string; email: string; password: string }) {
    const { data } = await apiClient.post<ApiEnvelope<RegistrationPending>>('/auth/register', input)
    return data.data
  },

  async verifyOtp(input: { email: string; otp: string }) {
    const { data } = await apiClient.post<ApiEnvelope<AuthPayload>>('/auth/verify-otp', input)
    return data.data
  },

  async resendOtp(email: string) {
    const { data } = await apiClient.post<ApiEnvelope<RegistrationPending>>('/auth/resend-otp', { email })
    return data.data
  },

  async login(input: { email: string; password: string }) {
    const { data } = await apiClient.post<ApiEnvelope<AuthPayload>>('/auth/login', input)
    return data.data
  },

  async getCurrentUser() {
    const { data } = await apiClient.get<ApiEnvelope<{ user: Session }>>('/auth/me')
    return data.data.user
  },
}
