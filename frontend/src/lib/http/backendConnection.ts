import { apiClient } from './apiClient'

export const backendConnection = {
  health: async () => (await apiClient.get('/health')).data,
  test: async () => (await apiClient.get('/test')).data,
  testCloudinary: async () => (await apiClient.get('/test-cloudinary')).data,
}
