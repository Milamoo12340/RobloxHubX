"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Asset } from "@/lib/types"
import { formatDate } from "@/lib/utils"

interface AssetListProps {
  assets: Asset[]
  onAssetSelect: (asset: Asset) => void
  selectedAsset: Asset | null
}

export function AssetList({ assets, onAssetSelect, selectedAsset }: AssetListProps) {
  const [sortField, setSortField] = useState<keyof Asset>("createdAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const handleSort = (field: keyof Asset) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const sortedAssets = [...assets].sort((a, b) => {
    if (sortField === "confidence" || sortField === "id") {
      return sortDirection === "asc"
        ? Number(a[sortField]) - Number(b[sortField])
        : Number(b[sortField]) - Number(a[sortField])
    }

    return sortDirection === "asc"
      ? String(a[sortField]).localeCompare(String(b[sortField]))
      : String(b[sortField]).localeCompare(String(a[sortField]))
  })

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return <Badge className="bg-green-600">High</Badge>
    if (confidence >= 50) return <Badge className="bg-yellow-600">Medium</Badge>
    return <Badge className="bg-red-600">Low</Badge>
  }

  return (
    <div className="rounded-md border border-zinc-800 overflow-hidden">
      <Table>
        <TableHeader className="bg-zinc-900">
          <TableRow>
            <TableHead
              className="cursor-pointer hover:text-emerald-400 transition-colors"
              onClick={() => handleSort("name")}
            >
              Asset Name
              {sortField === "name" && <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:text-emerald-400 transition-colors"
              onClick={() => handleSort("creatorName")}
            >
              Creator
              {sortField === "creatorName" && <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:text-emerald-400 transition-colors"
              onClick={() => handleSort("category")}
            >
              Category
              {sortField === "category" && <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:text-emerald-400 transition-colors"
              onClick={() => handleSort("confidence")}
            >
              Confidence
              {sortField === "confidence" && <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:text-emerald-400 transition-colors"
              onClick={() => handleSort("createdAt")}
            >
              Found
              {sortField === "createdAt" && <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAssets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                No assets found. Try adjusting your search or scan for new assets.
              </TableCell>
            </TableRow>
          ) : (
            sortedAssets.map((asset) => (
              <TableRow
                key={asset.id}
                className={`cursor-pointer hover:bg-zinc-800 transition-colors ${
                  selectedAsset?.id === asset.id ? "bg-zinc-800" : ""
                } ${!asset.seen ? "border-l-2 border-l-emerald-500" : ""}`}
                onClick={() => onAssetSelect(asset)}
              >
                <TableCell className="font-medium">
                  {asset.name}
                  {!asset.seen && <Badge className="ml-2 bg-emerald-600">New</Badge>}
                </TableCell>
                <TableCell>{asset.creatorName}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {asset.category}
                  </Badge>
                </TableCell>
                <TableCell>{getConfidenceBadge(asset.confidence)}</TableCell>
                <TableCell>{formatDate(asset.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
