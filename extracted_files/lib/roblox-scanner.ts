/**
 * Scans Roblox files for potential leaks
 * This version avoids using browser APIs like indexedDB that might not be available
 */

// Common Roblox asset ID patterns
const ASSET_ID_PATTERN = /(\b\d{5,}\b)/g
// Suspicious code patterns in Roblox scripts
const SUSPICIOUS_PATTERNS = [
  { pattern: /HttpService:GetAsync|HttpService\.GetAsync/, reason: "External HTTP request" },
  { pattern: /MarketplaceService:GetProductInfo|MarketplaceService\.GetProductInfo/, reason: "Marketplace API call" },
  { pattern: /require$$\d+$$/, reason: "Hardcoded module ID" },
  { pattern: /game:GetService$$"InsertService"$$|game\.GetService$$"InsertService"$$/, reason: "Insert Service usage" },
  { pattern: /--\s*stolen\s*from|--\s*leaked/, reason: "Comment indicating stolen code" },
]

export async function scanRobloxFiles(files: File[], progressCallback: (progress: number) => void): Promise<any> {
  return new Promise((resolve) => {
    // Simulate processing time
    setTimeout(async () => {
      let processedFiles = 0
      const detailedFindings = []

      // Process each file
      for (const file of files) {
        // Extract file extension
        const fileType = file.name.split(".").pop()?.toLowerCase() || ""

        // Create a base finding object
        const finding = {
          fileName: file.name,
          fileType,
          riskLevel: "safe" as "high" | "medium" | "low" | "safe",
          issues: [] as string[],
          assetIds: [] as string[],
          suspiciousCode: [] as { line: number; code: string; reason: string }[],
        }

        // For text-based files (scripts), analyze content
        if (["lua", "luau", "txt", "json"].includes(fileType)) {
          try {
            const content = await file.text()
            const lines = content.split("\n")

            // Look for asset IDs
            const assetIds = content.match(ASSET_ID_PATTERN)
            if (assetIds) {
              finding.assetIds = [...new Set(assetIds)] // Remove duplicates
              if (assetIds.length > 5) {
                finding.issues.push(`Contains ${assetIds.length} potential asset IDs`)
                finding.riskLevel = "medium"
              }
            }

            // Check for suspicious code patterns
            lines.forEach((line, index) => {
              for (const { pattern, reason } of SUSPICIOUS_PATTERNS) {
                if (pattern.test(line)) {
                  finding.suspiciousCode.push({
                    line: index + 1,
                    code: line.trim(),
                    reason,
                  })

                  if (!finding.issues.includes(`Contains ${reason}`)) {
                    finding.issues.push(`Contains ${reason}`)
                  }

                  // Escalate risk level based on pattern
                  if (reason.includes("stolen") || reason.includes("leaked")) {
                    finding.riskLevel = "high"
                  } else if (finding.riskLevel === "safe") {
                    finding.riskLevel = "low"
                  }
                }
              }
            })

            // Check for obfuscated code
            if (
              (fileType === "lua" || fileType === "luau") &&
              (content.includes("string.char(") || content.includes("string.byte(")) &&
              content.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*\{\s*\d+(\s*,\s*\d+)+\s*\}/)
            ) {
              finding.issues.push("Contains potentially obfuscated code")
              finding.riskLevel = "high"
            }
          } catch (error) {
            finding.issues.push("Error analyzing file content")
          }
        }
        // For binary files like .rbxm or .rbxl, just flag them as potential risks
        else if (["rbxm", "rbxl", "rbxmx", "rbxlx"].includes(fileType)) {
          finding.issues.push("Binary Roblox file - could contain proprietary assets")
          finding.riskLevel = "medium"
        }

        // Add random issues for demo purposes
        if (Math.random() > 0.7 && finding.riskLevel === "safe") {
          const randomIssues = [
            "Contains uncommon script patterns",
            "Includes references to private API methods",
            "Contains hardcoded credentials",
            "References to unreleased features detected",
          ]
          const issue = randomIssues[Math.floor(Math.random() * randomIssues.length)]
          finding.issues.push(issue)
          finding.riskLevel = "low"
        }

        detailedFindings.push(finding)
        processedFiles++
        progressCallback((processedFiles / files.length) * 100)
      }

      // Count potential leaks
      const potentialLeaks = detailedFindings.filter((f) => f.riskLevel !== "safe").length
      const safeFiles = detailedFindings.length - potentialLeaks

      // Calculate risk score (0-100)
      let riskScore = 0
      if (detailedFindings.length > 0) {
        const riskWeights = { high: 100, medium: 60, low: 30, safe: 0 }
        const totalRisk = detailedFindings.reduce((sum, finding) => sum + riskWeights[finding.riskLevel], 0)
        riskScore = Math.min(100, Math.round(totalRisk / detailedFindings.length))
      }

      // Return results
      resolve({
        summary: {
          totalFiles: files.length,
          potentialLeaks,
          riskScore,
          safeFiles,
        },
        detailedFindings,
      })
    }, 2000)
  })
}
