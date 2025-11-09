"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Asset } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { ExternalLink, Eye, Calendar, User, Tag, BarChart3 } from "lucide-react"

interface AssetDetailsProps {
  asset: Asset
  onClose: () => void
}

export function AssetDetails({ asset, onClose }: AssetDetailsProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {asset.name}
            {!asset.seen && <Badge className="bg-emerald-600">New</Badge>}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">Asset ID: {asset.assetId}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="aspect-square bg-zinc-800 rounded-md overflow-hidden">
              {asset.thumbnailUrl ? (
                <img
                  src={asset.thumbnailUrl || "/placeholder.svg"}
                  alt={asset.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500">No image available</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-zinc-400">
                <User size={16} />
                <span>Creator:</span>
              </div>
              <div>{asset.creatorName}</div>

              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar size={16} />
                <span>Found:</span>
              </div>
              <div>{formatDate(asset.createdAt)}</div>

              <div className="flex items-center gap-2 text-zinc-400">
                <Tag size={16} />
                <span>Category:</span>
              </div>
              <div className="capitalize">{asset.category}</div>

              <div className="flex items-center gap-2 text-zinc-400">
                <BarChart3 size={16} />
                <span>Confidence:</span>
              </div>
              <div>{asset.confidence}%</div>

              <div className="flex items-center gap-2 text-zinc-400">
                <Eye size={16} />
                <span>Status:</span>
              </div>
              <div>{asset.seen ? "Viewed" : "New"}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-1">Description</h3>
              <p className="text-zinc-300 whitespace-pre-wrap">{asset.description || "No description available."}</p>
            </div>

            {asset.keywords && asset.keywords.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-1">Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {asset.keywords.map((keyword, index) => (
                    <Badge key={index} variant="outline" className="bg-zinc-800">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-1">Source</h3>
              <p className="text-zinc-300">{asset.source}</p>
            </div>

            {asset.notes && (
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-1">Notes</h3>
                <p className="text-zinc-300 whitespace-pre-wrap">{asset.notes}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={asset.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <ExternalLink size={16} />
                View on Roblox
              </a>
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700">Mark as Seen</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
