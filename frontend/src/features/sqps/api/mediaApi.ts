import { apiClient } from '../../../lib/http/apiClient'

export interface UploadedImage {
  publicId: string
  url: string
  width: number
  height: number
  format: string
  bytes: number
  purpose: 'profile' | 'evidence'
}

interface ApiEnvelope<T> { success: boolean; data: T; requestId?: string }

export const mediaApi = {
  uploadImage: async (file: File, purpose: 'profile' | 'evidence' = 'profile', onProgress?: (percentage: number) => void) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('purpose', purpose)

    const response = await apiClient.post<ApiEnvelope<UploadedImage>>('/uploads/images', formData, {
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100))
      },
    })
    return response.data.data
  },
}
