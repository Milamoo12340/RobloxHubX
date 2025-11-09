"use client"

import type React from "react"

import { useState } from "react"
import { ShieldAlert, FileUp, AlertCircle, CheckCircle, Download, RefreshCw, Code, FileCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// All functionality is contained in a single client component to avoid any SSR issues

export default function ClientApp() {
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
      // Simulate scanning process
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Generate mock results
      const detailedFindings = files.map((file) => {
        const fileType = file.name.split(".").pop()?.toLowerCase() || ""
        const isRisky = Math.random() > 0.6
        const riskLevel = isRisky
          ? (["low", "medium", "high"][Math.floor(Math.random() * 3)] as "low" | "medium" | "high")
          : "safe"

        const issues: string[] = []
        if (riskLevel !== "safe") {
          const possibleIssues = [
            "Contains potentially obfuscated code",
            "Contains external HTTP requests",
            "Contains hardcoded asset IDs",
            "References to private API methods",
            "Contains suspicious comments",
            "Binary Roblox file - could contain proprietary assets",
          ]

          // Add 1-3 random issues
          const numIssues = Math.floor(Math.random() * 3) + 1
          for (let i = 0; i < numIssues; i++) {
            const issue = possibleIssues[Math.floor(Math.random() * possibleIssues.length)]
            if (!issues.includes(issue)) {
              issues.push(issue)
            }
          }
        }

        // Generate mock suspicious code for script files
        const suspiciousCode = []
        if ((fileType === "lua" || fileType === "luau") && riskLevel !== "safe") {
          const codeSamples = [
            { code: 'local http = game:GetService("HttpService")', reason: "External HTTP request" },
            { code: "require(1234567)", reason: "Hardcoded module ID" },
            { code: "-- Stolen from DevForum", reason: "Comment indicating stolen code" },
            { code: 'game:GetService("MarketplaceService"):GetProductInfo(123456)', reason: "Marketplace API call" },
          ]

          const numSamples = Math.floor(Math.random() * 2) + 1
          for (let i = 0; i < numSamples; i++) {
            const sample = codeSamples[Math.floor(Math.random() * codeSamples.length)]
            suspiciousCode.push({
              line: Math.floor(Math.random() * 100) + 1,
              code: sample.code,
              reason: sample.reason,
            })
          }
        }

        // Generate mock asset IDs
        const assetIds =
          riskLevel !== "safe"
            ? Array.from(
                { length: Math.floor(Math.random() * 5) + 1 },
                () => Math.floor(Math.random() * 9000000) + 1000000,
              ).map(String)
            : undefined

        return {
          fileName: file.name,
          fileType,
          riskLevel,
          issues,
          suspiciousCode: suspiciousCode.length > 0 ? suspiciousCode : undefined,
          assetIds,
        }
      })

      const potentialLeaks = detailedFindings.filter((f) => f.riskLevel !== "safe").length
      const safeFiles = files.length - potentialLeaks

      // Calculate risk score (0-100)
      const riskWeights = { high: 100, medium: 60, low: 30, safe: 0 }
      const totalRisk = detailedFindings.reduce(
        (sum, finding) => sum + riskWeights[finding.riskLevel as keyof typeof riskWeights],
        0,
      )
      const riskScore = Math.min(100, Math.round(totalRisk / detailedFindings.length))

      setResults({
        summary: {
          totalFiles: files.length,
          potentialLeaks,
          riskScore,
          safeFiles,
        },
        detailedFindings,
      })
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

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return "text-red-500 bg-red-50"
      case "medium":
        return "text-amber-500 bg-amber-50"
      case "low":
        return "text-blue-500 bg-blue-50"
      default:
        return "text-green-500 bg-green-50"
    }
  }

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case "lua":
      case "luau":
        return <FileCode className="h-4 w-4" />
      default:
        return <Code className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-red-600" />
            <h1 className="text-3xl font-bold text-slate-900">Roblox Asset Leak Scanner</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Protect your Roblox games from unauthorized distribution</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="mt-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            {!results ? (
              <>
                <h2 className="text-2xl font-bold mb-6 text-slate-800">Scan for Leaked Roblox Assets</h2>
                <p className="text-slate-600 mb-6">
                  Upload your Roblox game files (.lua, .luau, .rbxm, .rbxl) to scan for potential leaks or unauthorized
                  usage. Our scanner analyzes code patterns, asset IDs, and metadata to identify possible leaks.
                </p>

                {/* File Upload Area */}
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
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
                    <span className="text-lg font-medium text-slate-700 mb-1">Drag and drop Roblox files here</span>
                    <span className="text-sm text-slate-500 mb-4">or click to browse</span>
                    <Button variant="outline" disabled={isScanning}>
                      Select Files
                    </Button>
                  </label>
                </div>

                {/* Selected Files */}
                {files.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h3 className="font-medium mb-2 text-slate-800">Selected Files ({files.length})</h3>
                      <ul className="space-y-2 max-h-40 overflow-y-auto">
                        {files.map((file, index) => (
                          <li key={index} className="text-sm text-slate-600 flex justify-between">
                            <span className="truncate max-w-[80%]">{file.name}</span>
                            <span>{(file.size / 1024).toFixed(1)} KB</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Scanning Progress or Buttons */}
                    {isScanning ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">Scanning files...</span>
                          <span className="text-sm text-slate-500">{Math.round(progress)}%</span>
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
              /* Scan Results */
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Scan Results Summary</CardTitle>
                    <CardDescription>Analysis of {results.summary.totalFiles} Roblox asset files</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-slate-50 p-4 rounded-lg text-center">
                        <p className="text-sm text-slate-500">Total Files</p>
                        <p className="text-2xl font-bold">{results.summary.totalFiles}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg text-center">
                        <p className="text-sm text-slate-500">Potential Leaks</p>
                        <p className="text-2xl font-bold text-red-500">{results.summary.potentialLeaks}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg text-center">
                        <p className="text-sm text-slate-500">Safe Files</p>
                        <p className="text-2xl font-bold text-green-500">{results.summary.safeFiles}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg text-center">
                        <p className="text-sm text-slate-500">Overall Risk</p>
                        <div className="space-y-2">
                          <p className="text-lg font-bold">
                            {results.summary.riskScore < 30
                              ? "Low"
                              : results.summary.riskScore < 70
                                ? "Medium"
                                : "High"}
                          </p>
                          <Progress
                            value={results.summary.riskScore}
                            className="h-2"
                            indicatorClassName={
                              results.summary.riskScore < 30
                                ? "bg-green-500"
                                : results.summary.riskScore < 70
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Tabs defaultValue="all">
                  <div className="flex justify-between items-center mb-4">
                    <TabsList>
                      <TabsTrigger value="all">All Files</TabsTrigger>
                      <TabsTrigger value="risky">Potential Leaks</TabsTrigger>
                      <TabsTrigger value="safe">Safe Files</TabsTrigger>
                    </TabsList>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={resetScan}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        New Scan
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => alert("Report generation would be implemented in a production version")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Report
                      </Button>
                    </div>
                  </div>

                  <TabsContent value="all" className="mt-0">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          {results.detailedFindings.map((finding: any, index: number) => (
                            <div key={index} className="border rounded-lg overflow-hidden">
                              <div
                                className={`flex justify-between items-center p-4 ${getRiskColor(finding.riskLevel)}`}
                              >
                                <div className="flex items-center gap-2">
                                  {finding.riskLevel === "safe" ? (
                                    <CheckCircle className="h-5 w-5" />
                                  ) : (
                                    <AlertCircle className="h-5 w-5" />
                                  )}
                                  <span className="font-medium flex items-center gap-2">
                                    {finding.fileName}
                                    <span className="ml-2 text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full flex items-center gap-1">
                                      {getFileTypeIcon(finding.fileType)}
                                      {finding.fileType.toUpperCase()}
                                    </span>
                                  </span>
                                </div>
                                <span className="text-sm capitalize font-medium">{finding.riskLevel} Risk</span>
                              </div>
                              {finding.riskLevel !== "safe" && (
                                <div className="p-4 bg-white">
                                  <h4 className="font-medium mb-2 text-slate-800">Issues Detected:</h4>
                                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
                                    {finding.issues.map((issue: string, i: number) => (
                                      <li key={i}>{issue}</li>
                                    ))}
                                  </ul>

                                  {finding.suspiciousCode && finding.suspiciousCode.length > 0 && (
                                    <div className="mt-4">
                                      <h4 className="font-medium mb-2 text-slate-800">Suspicious Code:</h4>
                                      <div className="space-y-3">
                                        {finding.suspiciousCode.map((snippet: any, i: number) => (
                                          <div key={i} className="bg-slate-100 rounded-md p-3">
                                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                              <span>Line {snippet.line}</span>
                                              <span>{snippet.reason}</span>
                                            </div>
                                            <pre className="text-xs font-mono overflow-x-auto p-2 bg-white border rounded">
                                              {snippet.code}
                                            </pre>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {finding.assetIds && (
                                    <div className="mt-3">
                                      <h4 className="font-medium mb-1 text-slate-800">Detected Asset IDs:</h4>
                                      <div className="text-xs font-mono bg-slate-100 p-2 rounded overflow-x-auto">
                                        {finding.assetIds.join(", ")}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="risky" className="mt-0">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          {results.detailedFindings
                            .filter((f: any) => f.riskLevel !== "safe")
                            .map((finding: any, index: number) => (
                              <div key={index} className="border rounded-lg overflow-hidden">
                                <div
                                  className={`flex justify-between items-center p-4 ${getRiskColor(finding.riskLevel)}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5" />
                                    <span className="font-medium flex items-center gap-2">
                                      {finding.fileName}
                                      <span className="ml-2 text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full flex items-center gap-1">
                                        {getFileTypeIcon(finding.fileType)}
                                        {finding.fileType.toUpperCase()}
                                      </span>
                                    </span>
                                  </div>
                                  <span className="text-sm capitalize font-medium">{finding.riskLevel} Risk</span>
                                </div>
                                <div className="p-4 bg-white">
                                  <h4 className="font-medium mb-2 text-slate-800">Issues Detected:</h4>
                                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
                                    {finding.issues.map((issue: string, i: number) => (
                                      <li key={i}>{issue}</li>
                                    ))}
                                  </ul>

                                  {finding.suspiciousCode && finding.suspiciousCode.length > 0 && (
                                    <div className="mt-4">
                                      <h4 className="font-medium mb-2 text-slate-800">Suspicious Code:</h4>
                                      <div className="space-y-3">
                                        {finding.suspiciousCode.map((snippet: any, i: number) => (
                                          <div key={i} className="bg-slate-100 rounded-md p-3">
                                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                              <span>Line {snippet.line}</span>
                                              <span>{snippet.reason}</span>
                                            </div>
                                            <pre className="text-xs font-mono overflow-x-auto p-2 bg-white border rounded">
                                              {snippet.code}
                                            </pre>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {finding.assetIds && (
                                    <div className="mt-3">
                                      <h4 className="font-medium mb-1 text-slate-800">Detected Asset IDs:</h4>
                                      <div className="text-xs font-mono bg-slate-100 p-2 rounded overflow-x-auto">
                                        {finding.assetIds.join(", ")}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="safe" className="mt-0">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          {results.detailedFindings
                            .filter((f: any) => f.riskLevel === "safe")
                            .map((finding: any, index: number) => (
                              <div key={index} className="border rounded-lg overflow-hidden">
                                <div
                                  className={`flex justify-between items-center p-4 ${getRiskColor(finding.riskLevel)}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="font-medium flex items-center gap-2">
                                      {finding.fileName}
                                      <span className="ml-2 text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full flex items-center gap-1">
                                        {getFileTypeIcon(finding.fileType)}
                                        {finding.fileType.toUpperCase()}
                                      </span>
                                    </span>
                                  </div>
                                  <span className="text-sm capitalize font-medium">Safe</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
