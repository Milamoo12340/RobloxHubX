"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Asset } from "@/lib/types"
import { formatDate } from "@/lib/utils"

interface StatsPanelProps {
  assets: Asset[]
}

export function StatsPanel({ assets }: StatsPanelProps) {
  // Calculate stats
  const totalAssets = assets.length
  const newAssets = assets.filter((asset) => !asset.seen).length
  const highConfidenceAssets = assets.filter((asset) => asset.confidence >= 80).length
  const egyptAssets = assets.filter((asset) => asset.category === "egypt").length

  // Find most recent scan
  const mostRecentAsset =
    assets.length > 0
      ? assets.reduce((latest, asset) => (new Date(asset.createdAt) > new Date(latest.createdAt) ? asset : latest))
      : null

  // Get top categories
  const categoryCount: Record<string, number> = {}
  assets.forEach((asset) => {
    const category = asset.category || "uncategorized"
    categoryCount[category] = (categoryCount[category] || 0) + 1
  })

  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
      <CardHeader>
        <CardTitle className="text-lg">Asset Stats</CardTitle>
        <CardDescription className="text-zinc-400">
          {mostRecentAsset ? `Last updated: ${formatDate(mostRecentAsset.createdAt)}` : "No assets found"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-800 p-3 rounded-md">
            <div className="text-2xl font-bold text-emerald-500">{totalAssets}</div>
            <div className="text-xs text-zinc-400">Total Assets</div>
          </div>
          <div className="bg-zinc-800 p-3 rounded-md">
            <div className="text-2xl font-bold text-emerald-500">{newAssets}</div>
            <div className="text-xs text-zinc-400">New Assets</div>
          </div>
          <div className="bg-zinc-800 p-3 rounded-md">
            <div className="text-2xl font-bold text-emerald-500">{highConfidenceAssets}</div>
            <div className="text-xs text-zinc-400">High Confidence</div>
          </div>
          <div className="bg-zinc-800 p-3 rounded-md">
            <div className="text-2xl font-bold text-emerald-500">{egyptAssets}</div>
            <div className="text-xs text-zinc-400">Egypt Update</div>
          </div>
        </div>

        {topCategories.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-2">Top Categories</h3>
            <div className="space-y-2">
              {topCategories.map(([category, count]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{category}</span>
                  <span className="text-xs text-zinc-400">{count} assets</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
