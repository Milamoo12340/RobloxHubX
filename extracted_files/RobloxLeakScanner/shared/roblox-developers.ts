// Information about Pet Simulator 99 developers

export interface RobloxDeveloper {
  name: string;
  id: number;    // Roblox Creator ID
  role: string;  // Role in the development of Pet Simulator 99
  games: string[]; // Games associated with this developer
}

// Pet Simulator 99 game ID
export const PET_SIMULATOR_99_GAME_ID = 8737899170;

// List of official Pet Simulator 99 developers
export const petSimulatorDevelopers: RobloxDeveloper[] = [
  // Groups
  {
    name: "Big Games",
    id: 2703304,   // Big Games Group ID
    role: "Main Developer Studio",
    games: ["Pet Simulator 99", "Pet Simulator X", "Pet Simulator", "Blob Simulator"] 
  },
  {
    name: "Big Games Pets",
    id: 3959677,   // Big Games Pets Group ID
    role: "Pet Design & Assets",
    games: ["Pet Simulator 99", "Pet Simulator X"]
  },
  
  // Developers
  {
    name: "Preston",
    id: 13365322,   // Preston's Roblox User ID
    role: "Game Creator/Owner",
    games: ["Pet Simulator 99", "Pet Simulator X", "Pet Simulator"]
  },
  {
    name: "ChickenPutty",
    id: 19818133,   // ChickenPutty's Roblox User ID
    role: "Lead Developer",
    games: ["Pet Simulator 99", "Pet Simulator X", "Pet Simulator"]
  },
  {
    name: "BIG Games Pets Connor",
    id: 2213470865, // Connor's Roblox User ID
    role: "Pet Designer",
    games: ["Pet Simulator 99", "Pet Simulator X"]
  },
  {
    name: "BIG Games Pets Ethan",
    id: 2878290231, // Ethan's Roblox User ID
    role: "Pet Designer",
    games: ["Pet Simulator 99", "Pet Simulator X"]
  },
  {
    name: "Merely",
    id: 7707349,    // Merely's Roblox User ID
    role: "Developer",
    games: ["Pet Simulator 99", "Pet Simulator X"]
  }
];

// Function to check if a Roblox ID belongs to one of the Pet Simulator 99 developers
export function isOfficialPetSimulatorDeveloper(developerId: number): boolean {
  return petSimulatorDevelopers.some(developer => developer.id === developerId);
}

// Function to verify if content is from official Pet Simulator 99 sources
export function verifyPetSimulatorContent(metadata: {
  developerId?: number;
  gameName?: string;
  contentDescription?: string;
  gameId?: number;
  assetUrl?: string;
}): {
  isVerified: boolean;
  confidence: 'high' | 'medium' | 'low';
  developerInfo?: RobloxDeveloper;
  source?: string;
} {
  // Check if game ID matches Pet Simulator 99
  if (metadata.gameId === PET_SIMULATOR_99_GAME_ID) {
    return {
      isVerified: true,
      confidence: 'high',
      source: 'Game ID match'
    };
  }
  
  // Check if developer ID is provided and matches a known developer
  if (metadata.developerId) {
    const developer = petSimulatorDevelopers.find(dev => dev.id === metadata.developerId);
    if (developer) {
      return {
        isVerified: true,
        confidence: 'high',
        developerInfo: developer,
        source: 'Developer ID match'
      };
    }
  }
  
  // Check if the asset URL contains any of the developer IDs
  if (metadata.assetUrl) {
    const url = metadata.assetUrl.toLowerCase();
    for (const dev of petSimulatorDevelopers) {
      if (url.includes(`/${dev.id}/`) || url.includes(`user=${dev.id}`) || url.includes(`userid=${dev.id}`)) {
        return {
          isVerified: true,
          confidence: 'high',
          developerInfo: dev,
          source: 'Asset URL match'
        };
      }
    }
    
    // Check for game ID in URL
    if (url.includes(`/${PET_SIMULATOR_99_GAME_ID}/`) || 
        url.includes(`game=${PET_SIMULATOR_99_GAME_ID}`) || 
        url.includes(`placeid=${PET_SIMULATOR_99_GAME_ID}`)) {
      return {
        isVerified: true,
        confidence: 'high',
        source: 'Game ID in URL'
      };
    }
  }
  
  // If game name is provided, check if it's related to Pet Simulator 99
  if (metadata.gameName) {
    const gameName = metadata.gameName.toLowerCase();
    if (gameName.includes('pet simulator 99') || gameName.includes('pet sim 99')) {
      return {
        isVerified: true,
        confidence: 'medium',
        source: 'Game name match'
      };
    }
    
    // Check if it's related to Pet Simulator series
    if (gameName.includes('pet simulator') || gameName.includes('pet sim')) {
      return {
        isVerified: true,
        confidence: 'low',
        source: 'Pet Simulator series match'
      };
    }
  }
  
  // Check content description for hints
  if (metadata.contentDescription) {
    const description = metadata.contentDescription.toLowerCase();
    if (description.includes('pet simulator 99') || description.includes('pet sim 99')) {
      return {
        isVerified: true,
        confidence: 'medium',
        source: 'Description match'
      };
    }
    
    // Check for developer names in the description
    for (const dev of petSimulatorDevelopers) {
      if (description.toLowerCase().includes(dev.name.toLowerCase())) {
        return {
          isVerified: true,
          confidence: 'medium',
          developerInfo: dev,
          source: 'Developer name in description'
        };
      }
    }
  }
  
  // Default: unverified
  return {
    isVerified: false,
    confidence: 'low',
    source: 'No verification match'
  };
}