"use client"

import { useState, useEffect } from "react"
import { AssetList } from "@/components/asset-list"
import { SearchBar } from "@/components/search-bar"
import { SourceSelector } from "@/components/source-selector"
import { StatsPanel } from "@/components/stats-panel"
import { ScanButton } from "@/components/scan-button"
import { AssetDetails } from "@/components/asset-details"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { mockScanAssets, mockGetAssets } from "@/lib/mock-api"
import type { Asset, ScanResult, Source } from "@/lib/types"

export function AssetTrackerDashboard() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [selectedSources, setSelectedSources] = useState<Source[]>([
    { id: "1", name: "BIG Games", type: "developer", value: "1493409" },
    { id: "2", name: "Preston", type: "developer", value: "13365322" },
    { id: "3", name: "ChickenEngineer", type: "developer", value: "31370263" },
    { id: "4", name: "PS99", type: "game", value: "8737899226" },
  ])

  const { toast } = useToast()

  // Load initial assets
  useEffect(() => {
    const loadAssets = async () => {
      try {
        const initialAssets = await mockGetAssets()
        setAssets(initialAssets)
        setFilteredAssets(initialAssets)
      } catch (error) {
        console.error("Failed to load assets:", error)
        toast({
          title: "Error loading assets",
          description: "Failed to load asset data. Please try again.",
          variant: "destructive",
        })
      }
    }

    loadAssets()
  }, [toast])

  // Filter assets when search query or tab changes
  useEffect(() => {
    let filtered = [...assets]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (asset) =>
          asset.name.toLowerCase().includes(query) ||
          asset.description.toLowerCase().includes(query) ||
          asset.creatorName.toLowerCase().includes(query),
      )
    }

    // Apply tab filter
    if (activeTab === "new") {
      filtered = filtered.filter((asset) => !asset.seen)
    } else if (activeTab === "high-confidence") {
      filtered = filtered.filter((asset) => asset.confidence >= 80)
    } else if (activeTab === "egypt") {
      filtered = filtered.filter((asset) => asset.category === "egypt")
    }

    setFilteredAssets(filtered)
  }, [assets, searchQuery, activeTab])

  const handleScan = async () => {
    setIsScanning(true)

    try {
      const result: ScanResult = await mockScanAssets(selectedSources)

      if (result.newAssets > 0) {
        toast({
          title: "Scan Complete",
          description: `Found ${result.newAssets} new assets out of ${result.totalAssets} scanned.`,
        })

        // Refresh assets
        const updatedAssets = await mockGetAssets()
        setAssets(updatedAssets)
        setFilteredAssets(updatedAssets)
      } else {
        toast({
          title: "Scan Complete",
          description: "No new assets found.",
        })
      }
    } catch (error) {
      console.error("Scan failed:", error)
      toast({
        title: "Scan Failed",
        description: "Failed to scan for new assets. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsScanning(false)
    }
  }

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset)
  }

  const handleSourceChange = (sources: Source[]) => {
    setSelectedSources(sources)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  return (
    <div className="container mx-auto p-4">
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-emerald-500">Roblox Asset Tracker</h1>
          <p className="text-zinc-400">Monitor developer assets before they're released</p>
        </div>
        <ScanButton onScan={handleScan} isScanning={isScanning} />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <StatsPanel assets={assets} />
          <SourceSelector sources={selectedSources} onChange={handleSourceChange} />
        </div>

        <div className="lg:col-span-3 space-y-4">
          <SearchBar onSearch={handleSearch} />

          <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="all">All Assets</TabsTrigger>
              <TabsTrigger value="new">New Assets</TabsTrigger>
              <TabsTrigger value="high-confidence">High Confidence</TabsTrigger>
              <TabsTrigger value="egypt">Egypt Update</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <AssetList assets={filteredAssets} onAssetSelect={handleAssetSelect} selectedAsset={selectedAsset} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {selectedAsset && <AssetDetails asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
    </div>
  )
}
