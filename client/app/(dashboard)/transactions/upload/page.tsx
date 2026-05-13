"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { 
  TrendingUp, 
  Upload as UploadIcon,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  X
} from "lucide-react"
import { useUpload } from "@/hooks/use-upload"
import { Upload } from "@/lib/api"

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [source, setSource] = useState("csv")
  const [dragActive, setDragActive] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [uploadResult, setUploadResult] = useState<Upload | null>(null)

  const { 
    isUploading, 
    uploadProgress, 
    currentUpload,
    uploadHistory, 
    error,
    initiateUpload,
    processUpload,
    getHistory
  } = useUpload()

  useEffect(() => {
    getHistory()
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const validTypes = ["text/csv", "application/pdf", "application/vnd.ms-excel", 
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
      
      if (file.name.endsWith(".csv") || file.name.endsWith(".pdf") || 
          file.name.endsWith(".xls") || file.name.endsWith(".xlsx")) {
        setSelectedFile(file)
      } else {
        alert("Please upload a valid file (CSV, PDF, XLS, or XLSX)")
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      const uploadId = await initiateUpload(source)
      const result = await processUpload(uploadId, selectedFile)
      setUploadResult(result)
      setUploadComplete(true)
      getHistory()
    } catch (err) {
      console.error("Upload failed:", err)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setUploadComplete(false)
    setUploadResult(null)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-400" />
      default:
        return <Clock className="h-4 w-4 text-slate-400" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", { 
      day: "numeric", 
      month: "short", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Header */}

      <main className="p-6 pb-12">
        <div className="mx-auto max-w-3xl px-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Upload Bank Statement</h1>
            <p className="text-slate-400">Import transactions from your bank statement file.</p>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
              {error}
            </div>
          )}

          {/* Upload Area */}
          {!uploadComplete ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              {/* Source Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Select Source Type
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  disabled={isUploading}
                >
                  <option value="csv">CSV (Excel Export)</option>
                  <option value="pdf">PDF Statement</option>
                  <option value="hdfc">HDFC Bank</option>
                  <option value="icici">ICICI Bank</option>
                  <option value="sbi">SBI Bank</option>
                  <option value="axis">Axis Bank</option>
                </select>
              </div>

              {/* Drop Zone */}
              <div
                className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
                  dragActive 
                    ? "border-green-500 bg-green-500/10" 
                    : selectedFile 
                      ? "border-green-500 bg-green-500/5" 
                      : "border-white/20 hover:border-white/40"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                      <FileText className="h-8 w-8 text-green-400" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-white">{selectedFile.name}</p>
                      <p className="text-sm text-slate-400">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    {!isUploading && (
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="rounded-lg bg-white/10 p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 mx-auto mb-4">
                      <UploadIcon className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-lg font-medium text-white mb-2">
                      Drag and drop your file here
                    </p>
                    <p className="text-sm text-slate-400 mb-4">
                      or click to browse from your computer
                    </p>
                    <input
                      type="file"
                      accept=".csv,.pdf,.xls,.xlsx"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploading}
                    />
                  </>
                )}
              </div>

              {/* Supported Formats */}
              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> CSV
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> PDF
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> XLS
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> XLSX
                </span>
              </div>

              {/* Upload Button */}
              {selectedFile && (
                <div className="mt-6">
                  {isUploading ? (
                    <div className="space-y-2">
                      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-slate-400 text-center">
                        Processing... {uploadProgress}%
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleUpload}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 cursor-pointer"
                    >
                      <UploadIcon className="h-4 w-4" />
                      Upload and Process
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Upload Complete
            <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Upload Complete!</h2>
                <p className="text-slate-400 mb-6">Your transactions have been imported successfully.</p>

                {uploadResult && (
                  <>
                    <div className="w-full grid grid-cols-3 gap-4 mb-6">
                      <div className="rounded-xl bg-white/5 p-4">
                        <p className="text-2xl font-bold text-green-400">{uploadResult.imported_transactions}</p>
                        <p className="text-xs text-slate-400">Imported</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-4">
                        <p className="text-2xl font-bold text-yellow-400">{uploadResult.duplicate_transactions}</p>
                        <p className="text-xs text-slate-400">Duplicates</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-4">
                        <p className="text-2xl font-bold text-red-400">{uploadResult.failed_transactions}</p>
                        <p className="text-xs text-slate-400">Failed</p>
                      </div>
                    </div>

                    {/* Reconciliation Details */}
                    {(uploadResult.statement_balance_extracted || uploadResult.reconciliation_status) && (
                      <div className="w-full mb-6">
                        <h3 className="text-sm font-semibold text-white mb-3">Reconciliation Status</h3>
                        <div className="rounded-xl bg-white/5 p-4 space-y-3">
                          {uploadResult.statement_date_extracted && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-400">Statement Date</span>
                              <span className="text-sm font-medium text-white">
                                {new Date(uploadResult.statement_date_extracted).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                })}
                              </span>
                            </div>
                          )}
                          
                          {uploadResult.statement_balance_extracted !== null && uploadResult.statement_balance_extracted !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-400">Extracted Balance</span>
                              <span className="text-sm font-medium text-green-400">
                                ₹{uploadResult.statement_balance_extracted.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}

                          {uploadResult.reconciliation_status && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-400">Reconciliation Status</span>
                              <span className={`text-sm font-medium px-2.5 py-1 rounded-lg inline-block ${
                                uploadResult.reconciliation_status === "reconciled" 
                                  ? "bg-green-500/10 text-green-400"
                                  : uploadResult.reconciliation_status === "discrepancy"
                                  ? "bg-yellow-500/10 text-yellow-400"
                                  : "bg-slate-500/10 text-slate-400"
                              }`}>
                                {uploadResult.reconciliation_status.charAt(0).toUpperCase() + uploadResult.reconciliation_status.slice(1)}
                              </span>
                            </div>
                          )}

                          {uploadResult.balance_discrepancy !== null && uploadResult.balance_discrepancy !== undefined && uploadResult.balance_discrepancy !== 0 && (
                            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                              <span className="text-sm text-slate-400">Balance Discrepancy</span>
                              <span className="text-sm font-medium text-orange-400">
                                ₹{Math.abs(uploadResult.balance_discrepancy).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Upload Another
                  </button>
                  <Link
                    href="/transactions"
                    className="rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-[#020617] hover:bg-green-400 transition-colors"
                  >
                    View Transactions
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Upload History */}
          {uploadHistory.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Upload History</h2>
              <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-sm">
                <div className="divide-y divide-white/5">
                  {uploadHistory.map((upload) => (
                    <div 
                      key={upload.id}
                      className="p-4 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(upload.status)}
                          <div>
                            <p className="text-sm font-medium text-white">{upload.file_name}</p>
                            <p className="text-xs text-slate-400">{formatDate(upload.created_at)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-300">{upload.imported_transactions} imported</p>
                          <p className="text-xs text-slate-500">{upload.source}</p>
                        </div>
                      </div>
                      
                      {/* Reconciliation Status for History */}
                      {upload.reconciliation_status && (
                        <div className="ml-8 flex items-center gap-2 text-xs">
                          <span className={`px-2 py-1 rounded inline-block ${
                            upload.reconciliation_status === "reconciled" 
                              ? "bg-green-500/10 text-green-400"
                              : upload.reconciliation_status === "discrepancy"
                              ? "bg-yellow-500/10 text-yellow-400"
                              : "bg-slate-500/10 text-slate-400"
                          }`}>
                            Reconciliation: {upload.reconciliation_status.charAt(0).toUpperCase() + upload.reconciliation_status.slice(1)}
                          </span>
                          {upload.balance_discrepancy !== null && upload.balance_discrepancy !== undefined && upload.balance_discrepancy !== 0 && (
                            <span className="text-orange-400">
                              Discrepancy: ₹{Math.abs(upload.balance_discrepancy).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
