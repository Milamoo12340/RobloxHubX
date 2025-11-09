"use client"

import { AlertCircle, CheckCircle, Download, RefreshCw, Code, FileCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface ScanResultsProps {
  results: {
    summary: {
      totalFiles: number
      potentialLeaks: number
      riskScore: number
      safeFiles: number
    }
    detailedFindings: Array<{
      fileName: string
      fileType: string
      riskLevel: "high" | "medium" | "low" | "safe"
      issues: string[]
      assetIds?: string[]
      suspiciousCode?: {
        line: number
        code: string
        reason: string
      }[]
    }>
  }
  onReset: () => void
}

export default function ScanResults({ results, onReset }: ScanResultsProps) {
  const { summary, detailedFindings } = results

  const generateReport = () => {
    // In a real app, this would generate a downloadable report
    alert("Report generation would be implemented in a production version")
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return "text-red-500 bg-red-50 dark:bg-red-900/20"
      case "medium":
        return "text-amber-500 bg-amber-50 dark:bg-amber-900/20"
      case "low":
        return "text-blue-500 bg-blue-50 dark:bg-blue-900/20"
      default:
        return "text-green-500 bg-green-50 dark:bg-green-900/20"
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Scan Results Summary</CardTitle>
          <CardDescription>Analysis of {summary.totalFiles} Roblox asset files</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Files</p>
              <p className="text-2xl font-bold">{summary.totalFiles}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">Potential Leaks</p>
              <p className="text-2xl font-bold text-red-500">{summary.potentialLeaks}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">Safe Files</p>
              <p className="text-2xl font-bold text-green-500">{summary.safeFiles}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">Overall Risk</p>
              <div className="space-y-2">
                <p className="text-lg font-bold">
                  {summary.riskScore < 30 ? "Low" : summary.riskScore < 70 ? "Medium" : "High"}
                </p>
                <Progress
                  value={summary.riskScore}
                  className="h-2"
                  indicatorClassName={
                    summary.riskScore < 30 ? "bg-green-500" : summary.riskScore < 70 ? "bg-amber-500" : "bg-red-500"
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
            <Button variant="outline" size="sm" onClick={onReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              New Scan
            </Button>
            <Button size="sm" onClick={generateReport}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {detailedFindings.map((finding, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div className={`flex justify-between items-center p-4 ${getRiskColor(finding.riskLevel)}`}>
                      <div className="flex items-center gap-2">
                        {finding.riskLevel === "safe" ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <AlertCircle className="h-5 w-5" />
                        )}
                        <span className="font-medium flex items-center gap-2">
                          {finding.fileName}
                          <Badge variant="outline" className="ml-2 flex items-center gap-1">
                            {getFileTypeIcon(finding.fileType)}
                            {finding.fileType.toUpperCase()}
                          </Badge>
                        </span>
                      </div>
                      <span className="text-sm capitalize font-medium">{finding.riskLevel} Risk</span>
                    </div>
                    {finding.riskLevel !== "safe" && (
                      <div className="p-4 bg-white dark:bg-slate-800">
                        <h4 className="font-medium mb-2 text-slate-800 dark:text-slate-200">Issues Detected:</h4>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                          {finding.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>

                        {finding.suspiciousCode && finding.suspiciousCode.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2 text-slate-800 dark:text-slate-200">Suspicious Code:</h4>
                            <div className="space-y-3">
                              {finding.suspiciousCode.map((snippet, i) => (
                                <div key={i} className="bg-slate-100 dark:bg-slate-900 rounded-md p-3">
                                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                                    <span>Line {snippet.line}</span>
                                    <span>{snippet.reason}</span>
                                  </div>
                                  <pre className="text-xs font-mono overflow-x-auto p-2 bg-white dark:bg-slate-800 border rounded">
                                    {snippet.code}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {finding.assetIds && (
                          <div className="mt-3">
                            <h4 className="font-medium mb-1 text-slate-800 dark:text-slate-200">Detected Asset IDs:</h4>
                            <div className="text-xs font-mono bg-slate-100 dark:bg-slate-900 p-2 rounded overflow-x-auto">
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
                {detailedFindings
                  .filter((f) => f.riskLevel !== "safe")
                  .map((finding, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <div className={`flex justify-between items-center p-4 ${getRiskColor(finding.riskLevel)}`}>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" />
                          <span className="font-medium flex items-center gap-2">
                            {finding.fileName}
                            <Badge variant="outline" className="ml-2 flex items-center gap-1">
                              {getFileTypeIcon(finding.fileType)}
                              {finding.fileType.toUpperCase()}
                            </Badge>
                          </span>
                        </div>
                        <span className="text-sm capitalize font-medium">{finding.riskLevel} Risk</span>
                      </div>
                      <div className="p-4 bg-white dark:bg-slate-800">
                        <h4 className="font-medium mb-2 text-slate-800 dark:text-slate-200">Issues Detected:</h4>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                          {finding.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>

                        {finding.suspiciousCode && finding.suspiciousCode.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2 text-slate-800 dark:text-slate-200">Suspicious Code:</h4>
                            <div className="space-y-3">
                              {finding.suspiciousCode.map((snippet, i) => (
                                <div key={i} className="bg-slate-100 dark:bg-slate-900 rounded-md p-3">
                                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                                    <span>Line {snippet.line}</span>
                                    <span>{snippet.reason}</span>
                                  </div>
                                  <pre className="text-xs font-mono overflow-x-auto p-2 bg-white dark:bg-slate-800 border rounded">
                                    {snippet.code}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {finding.assetIds && (
                          <div className="mt-3">
                            <h4 className="font-medium mb-1 text-slate-800 dark:text-slate-200">Detected Asset IDs:</h4>
                            <div className="text-xs font-mono bg-slate-100 dark:bg-slate-900 p-2 rounded overflow-x-auto">
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
                {detailedFindings
                  .filter((f) => f.riskLevel === "safe")
                  .map((finding, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <div className={`flex justify-between items-center p-4 ${getRiskColor(finding.riskLevel)}`}>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium flex items-center gap-2">
                            {finding.fileName}
                            <Badge variant="outline" className="ml-2 flex items-center gap-1">
                              {getFileTypeIcon(finding.fileType)}
                              {finding.fileType.toUpperCase()}
                            </Badge>
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
  )
}
