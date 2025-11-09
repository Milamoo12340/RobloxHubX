import type { Asset, ScanResult, Source } from "@/lib/types"

// Mock assets data
const mockAssets: Asset[] = [
  {
    id: "1",
    assetId: "12345678",
    name: "Egypt Pyramid Pet",
    description: "A mysterious pet from the ancient pyramids of Egypt. Coming soon to Pet Simulator 99!",
    assetType: "Model",
    creatorId: "1493409",
    creatorName: "BIG Games",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    thumbnailUrl: "/placeholder.svg?height=420&width=420",
    url: "https://www.roblox.com/catalog/12345678",
    source: "Developer Profile",
    sourceType: "developer",
    category: "egypt",
    confidence: 95,
    seen: false,
    keywords: ["egypt", "pyramid", "pet", "ps99"],
  },
  {
    id: "2",
    assetId: "23456789",
    name: "Anubis Guardian",
    description: "The guardian of the underworld, now available as a limited pet!",
    assetType: "Model",
    creatorId: "13365322",
    creatorName: "Preston",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    thumbnailUrl: "/placeholder.svg?height=420&width=420",
    url: "https://www.roblox.com/catalog/23456789",
    source: "Developer Profile",
    sourceType: "developer",
    category: "egypt",
    confidence: 90,
    seen: false,
    keywords: ["anubis", "egypt", "guardian", "ps99"],
  },
  {
    id: "3",
    assetId: "34567890",
    name: "Desert Oasis Zone",
    description: "A new zone for Pet Simulator 99 with exotic pets and treasures.",
    assetType: "Place",
    creatorId: "31370263",
    creatorName: "ChickenEngineer",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    thumbnailUrl: "/placeholder.svg?height=420&width=420",
    url: "https://www.roblox.com/catalog/34567890",
    source: "Developer Profile",
    sourceType: "developer",
    category: "egypt",
    confidence: 85,
    seen: true,
    keywords: ["desert", "oasis", "zone", "ps99"],
  },
  {
    id: "4",
    assetId: "45678901",
    name: "Pharaoh's Crown",
    description: "The crown of the ancient pharaohs, now available as a limited accessory.",
    assetType: "Hat",
    creatorId: "1493409",
    creatorName: "BIG Games",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
    thumbnailUrl: "/placeholder.svg?height=420&width=420",
    url: "https://www.roblox.com/catalog/45678901",
    source: "Group Assets",
    sourceType: "group",
    category: "egypt",
    confidence: 80,
    seen: true,
    keywords: ["pharaoh", "crown", "egypt", "ps99"],
  },
  {
    id: "5",
    assetId: "56789012",
    name: "Huge Slime Pet",
    description: "A massive slime pet that bounces around and collects coins.",
    assetType: "Model",
    creatorId: "1493409",
    creatorName: "BIG Games",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    thumbnailUrl: "/placeholder.svg?height=420&width=420",
    url: "https://www.roblox.com/catalog/56789012",
    source: "Game Assets",
    sourceType: "game",
    category: "pet",
    confidence: 75,
    seen: true,
    keywords: ["huge", "slime", "pet", "ps99"],
  },
  {
    id: "6",
    assetId: "67890123",
    name: "Triple Coins Potion",
    description: "Triples your coin collection for 30 minutes!",
    assetType: "Model",
    creatorId: "13365322",
    creatorName: "Preston",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    thumbnailUrl: "/placeholder.svg?height=420&width=420",
    url: "https://www.roblox.com/catalog/67890123",
    source: "Developer Profile",
    sourceType: "developer",
    category: "potion",
    confidence: 70,
    seen: true,
    keywords: ["triple", "coins", "potion", "ps99"],
  },
  {
    id: "7",
    assetId: "78901234",
    name: "Scarab Beetle Pet",
    description: "An ancient scarab beetle pet with mystical powers.",
    assetType: "Model",
    creatorId: "31370263",
    creatorName: "ChickenEngineer",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    thumbnailUrl: "/placeholder.svg?height=420&width=420",
    url: "https://www.roblox.com/catalog/78901234",
    source: "Marketplace Search",
    sourceType: "marketplace",
    category: "egypt",
    confidence: 65,
    seen: false,
    keywords: ["scarab", "beetle", "egypt", "ps99"],
  },
  {
    id: "8",
    assetId: "89012345",
    name: "Mummy Wrap Texture",
    description: "A texture for creating mummy-wrapped pets and characters.",
    assetType: "Decal",
    creatorId: "1493409",
    creatorName: "BIG Games",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
    thumbnailUrl: "/placeholder.svg?height=420&width=420",
    url: "https://www.roblox.com/catalog/89012345",
    source: "Group Assets",
    sourceType: "group",
    category: "egypt",
    confidence: 60,
    seen: true,
    keywords: ["mummy", "wrap", "texture", "egypt"],
  },
]

// Mock API functions
export async function mockGetAssets(): Promise<Asset[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return [...mockAssets]
}

export async function mockScanAssets(sources: Source[]): Promise<ScanResult> {
  // Simulate scanning delay
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // Simulate finding new assets (random between 0-3)
  const newAssets = Math.floor(Math.random() * 4)

  return {
    success: true,
    newAssets,
    totalAssets: mockAssets.length + newAssets,
    scanTime: 3.2,
  }
}
