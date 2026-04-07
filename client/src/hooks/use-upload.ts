"use client"

import { useState, useCallback } from "react"
import { api, Upload, UploadHistoryResponse, ApiError } from "@/lib/api"

interface UseUploadResult {
  isUploading: boolean
  uploadProgress: number
  currentUpload: Upload | null
  uploadHistory: Upload[]
  error: string | null
  initiateUpload: (source: string) => Promise<string>
  processUpload: (uploadId: string, file: File) => Promise<Upload>
  getUploadStatus: (id: string) => Promise<Upload>
  getHistory: () => Promise<void>
}

export function useUpload(): UseUploadResult {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentUpload, setCurrentUpload] = useState<Upload | null>(null)
  const [uploadHistory, setUploadHistory] = useState<Upload[]>([])
  const [error, setError] = useState<string | null>(null)

  const initiateUpload = async (source: string): Promise<string> => {
    try {
      const response = await api.initiateUpload(source)
      return response.upload_id
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to initiate upload")
      }
      throw err
    }
  }

  const processUpload = async (uploadId: string, file: File): Promise<Upload> => {
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const result = await api.processUpload(uploadId, file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      setCurrentUpload(result.summary)
      
      return result.summary
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to process upload")
      }
      throw err
    } finally {
      setIsUploading(false)
    }
  }

  const getUploadStatus = async (id: string): Promise<Upload> => {
    try {
      const upload = await api.getUploadStatus(id)
      setCurrentUpload(upload)
      return upload
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to get upload status")
      }
      throw err
    }
  }

  const getHistory = async (): Promise<void> => {
    try {
      const response = await api.getUploadHistory()
      setUploadHistory(response.uploads)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to get upload history")
      }
    }
  }

  return {
    isUploading,
    uploadProgress,
    currentUpload,
    uploadHistory,
    error,
    initiateUpload,
    processUpload,
    getUploadStatus,
    getHistory,
  }
}
