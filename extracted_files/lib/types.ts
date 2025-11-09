export interface Asset {
  id: string
  assetId: string
  name: string
  description: string
  assetType: string
  creatorId: string
  creatorName: string
  createdAt: string
  thumbnailUrl?: string
  url: string
  source: string
  sourceType: string
  category: string
  confidence: number
  seen: boolean
  keywords?: string[]
  notes?: string
}

export interface Source {
  id: string
  type: "developer" | "group" | "game" | "keyword"
  value: string
  name: string
  enabled?: boolean
}

export interface ScanResult {
  success: boolean
  newAssets: number
  totalAssets: number
  scanTime: number
  error?: string
}
