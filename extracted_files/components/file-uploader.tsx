"use client"

import type React from "react"

import { useState } from "react"
import { FileUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { scanFiles } from "@/lib/scanner"
import dynamic from "next/dynamic"

// Dynamically import ScanResults to avoid SSR issues
const ScanResults = dynamic(() => import("./scan-results"), {
  ssr: false,
  loading: () => (
    <div className="py-8 text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-400" />
      <p className="text-slate-600 dark:text-slate-400">Loading results...</p>
    </div>
  ),
})

export default function FileUploader() {
  const [files, setFiles] = useState<File[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<any>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleScan = async () => {
    if (files.length === 0) return

    setIsScanning(true)
    setProgress(0)

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + Math.random() * 10
        return newProgress >= 100 ? 100 : newProgress
      })
    }, 300)

    try {
      // Scan files and get results
      const scanResults = await scanFiles(files, (progress) => {
        setProgress(progress)
      })

      setResults(scanResults)
    } catch (error) {
      console.error("Scanning error:", error)
    } finally {
      clearInterval(progressInterval)
      setProgress(100)
      setTimeout(() => {
        setIsScanning(false)
      }, 500)
    }
  }

  const resetScan = () => {
    setFiles([])
    setResults(null)
    setProgress(0)
  }

  return (
    <div className="space-y-6">
      {!results ? (
        <>
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center">
            <input
              type="file"
              id="file-upload"
              multiple
              onChange={handleFileChange}
              className="hidden"
              accept=".lua,.luau,.rbxm,.rbxl,.rbxlx,.rbxmx,.json,.txt"
              disabled={isScanning}
            />
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer">
              <FileUp className="h-12 w-12 text-slate-400 mb-3" />
              <span className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">
                Drag and drop Roblox files here
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400 mb-4">or click to browse</span>
              <Button variant="outline" disabled={isScanning}>
                Select Files
              </Button>
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <h3 className="font-medium mb-2 text-slate-800 dark:text-slate-200">Selected Files ({files.length})</h3>
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                  {files.map((file, index) => (
                    <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex justify-between">
                      <span className="truncate max-w-[80%]">{file.name}</span>
                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                    </li>
                  ))}
                </ul>
              </div>

              {isScanning ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Scanning files...</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button onClick={handleScan} className="w-full">
                    Start Scan
                  </Button>
                  <Button variant="outline" onClick={resetScan}>
                    Reset
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <ScanResults results={results} onReset={resetScan} />
      )}
    </div>
  )
}
