import { z } from "zod";
import { CommandType } from "./discord";

// Validation schemas for command options
export const uploadCommandSchema = z.object({
  mode: z.enum(["asset", "script", "model", "map"]),
});

export const leakCommandSchema = z.object({
  id: z.string().startsWith("asset_"),
  channel: z.string().startsWith("#"),
});

export const searchCommandSchema = z.object({
  query: z.string().min(1),
  category: z.string().optional(),
});

export const categorizeCommandSchema = z.object({
  id: z.string().startsWith("asset_"),
  category: z.string().min(1),
  tags: z.array(z.string()),
});

export const verifyCommandSchema = z.object({
  id: z.string().startsWith("asset_"),
  developerId: z.number().optional(),
  gameName: z.string().optional(),
  contentDescription: z.string().optional(),
});

export const monitorCommandSchema = z.object({
  developerIds: z.array(z.number()).optional(),
  gameFilter: z.string().optional(),
  channelId: z.string(),
  autoDiscover: z.boolean().optional(),
  discoveryDepth: z.number().optional(),
  keywordFilters: z.array(z.string()).optional(), // Keywords to filter auto-discovery results
});

// Functions to parse Discord-like commands
export function parseCommand(commandText: string) {
  // Check if it starts with a slash
  if (!commandText.startsWith('/')) {
    throw new Error("Invalid command format. Commands must start with '/'");
  }
  
  // Split the command and arguments
  const parts = commandText.slice(1).split(' ');
  const commandName = parts[0].toLowerCase();
  const argsString = parts.slice(1).join(' ');
  
  // Parse based on command type
  switch (commandName) {
    case CommandType.UPLOAD:
      return {
        type: CommandType.UPLOAD,
        options: parseUploadCommand(argsString)
      };
      
    case CommandType.LEAK:
      return {
        type: CommandType.LEAK,
        options: parseLeakCommand(argsString)
      };
      
    case CommandType.SEARCH:
      return {
        type: CommandType.SEARCH,
        options: parseSearchCommand(argsString)
      };
      
    case CommandType.CATEGORIZE:
      return {
        type: CommandType.CATEGORIZE,
        options: parseCategorizeCommand(argsString)
      };
      
    case CommandType.VERIFY:
      return {
        type: CommandType.VERIFY,
        options: parseVerifyCommand(argsString)
      };
      
    case CommandType.MONITOR:
      return {
        type: CommandType.MONITOR,
        options: parseMonitorCommand(argsString)
      };
      
    case CommandType.HELP:
      return {
        type: CommandType.HELP,
        options: {}
      };
      
    default:
      throw new Error(`Unknown command: /${commandName}`);
  }
}

function parseUploadCommand(argsString: string) {
  // Extract mode parameter
  const modeMatch = argsString.match(/mode:\s*(\w+)/i);
  if (!modeMatch) {
    throw new Error("Missing 'mode' parameter for upload command");
  }
  
  const options = {
    mode: modeMatch[1]
  };
  
  return uploadCommandSchema.parse(options);
}

function parseLeakCommand(argsString: string) {
  // Extract id and channel parameters
  const idMatch = argsString.match(/id:\s*(\w+)/i);
  const channelMatch = argsString.match(/channel:\s*(#\w+[-\w]*)/i);
  
  if (!idMatch) {
    throw new Error("Missing 'id' parameter for leak command");
  }
  
  if (!channelMatch) {
    throw new Error("Missing 'channel' parameter for leak command");
  }
  
  const options = {
    id: idMatch[1],
    channel: channelMatch[1]
  };
  
  return leakCommandSchema.parse(options);
}

function parseSearchCommand(argsString: string) {
  // Extract query and optional category parameters
  const queryMatch = argsString.match(/query:\s*([^\s]+)/i);
  const categoryMatch = argsString.match(/category:\s*(\w+)/i);
  
  if (!queryMatch) {
    throw new Error("Missing 'query' parameter for search command");
  }
  
  const options = {
    query: queryMatch[1],
    category: categoryMatch ? categoryMatch[1] : undefined
  };
  
  return searchCommandSchema.parse(options);
}

function parseCategorizeCommand(argsString: string) {
  // Extract id, category and tags parameters
  const idMatch = argsString.match(/id:\s*(\w+)/i);
  const categoryMatch = argsString.match(/category:\s*(\w+)/i);
  const tagsMatch = argsString.match(/tags:\s*([\w\s,]+)/i);
  
  if (!idMatch) {
    throw new Error("Missing 'id' parameter for categorize command");
  }
  
  if (!categoryMatch) {
    throw new Error("Missing 'category' parameter for categorize command");
  }
  
  const tags = tagsMatch 
    ? tagsMatch[1].split(',').map(tag => tag.trim()) 
    : [];
  
  const options = {
    id: idMatch[1],
    category: categoryMatch[1],
    tags
  };
  
  return categorizeCommandSchema.parse(options);
}

function parseVerifyCommand(argsString: string) {
  // Extract id and optional parameters
  const idMatch = argsString.match(/id:\s*(\w+)/i);
  const developerIdMatch = argsString.match(/developerId:\s*(\d+)/i);
  const gameNameMatch = argsString.match(/gameName:\s*([^,]+)/i);
  const descriptionMatch = argsString.match(/description:\s*([^,]+)/i);
  
  if (!idMatch) {
    throw new Error("Missing 'id' parameter for verify command");
  }
  
  const options = {
    id: idMatch[1],
    developerId: developerIdMatch ? parseInt(developerIdMatch[1]) : undefined,
    gameName: gameNameMatch ? gameNameMatch[1].trim() : undefined,
    contentDescription: descriptionMatch ? descriptionMatch[1].trim() : undefined
  };
  
  return verifyCommandSchema.parse(options);
}

function parseMonitorCommand(argsString: string) {
  // Extract channelId and optional parameters
  const channelIdMatch = argsString.match(/channelId:\s*([^\s,]+)/i);
  const developerIdsMatch = argsString.match(/developerIds:\s*\[([\d,\s]+)\]/i);
  const gameFilterMatch = argsString.match(/gameFilter:\s*([^,]+)/i);
  const autoDiscoverMatch = argsString.match(/autoDiscover:\s*(true|false)/i);
  const discoveryDepthMatch = argsString.match(/discoveryDepth:\s*(\d+)/i);
  const keywordFiltersMatch = argsString.match(/keywordFilters:\s*\[([\w\s",]+)\]/i);
  
  if (!channelIdMatch) {
    throw new Error("Missing 'channelId' parameter for monitor command");
  }
  
  // Parse developer IDs if provided
  let developerIds: number[] | undefined = undefined;
  if (developerIdsMatch) {
    developerIds = developerIdsMatch[1]
      .split(',')
      .map(id => id.trim())
      .filter(id => !!id)
      .map(id => parseInt(id));
  }
  
  // Parse keyword filters if provided
  let keywordFilters: string[] | undefined = undefined;
  if (keywordFiltersMatch) {
    const filtersStr = keywordFiltersMatch[1];
    // Handle quoted strings with commas
    const matches = filtersStr.match(/"[^"]+"|[^,]+/g);
    if (matches) {
      keywordFilters = matches.map(s => s.replace(/"/g, '').trim()).filter(s => s);
    }
  }
  
  const options = {
    channelId: channelIdMatch[1],
    developerIds,
    gameFilter: gameFilterMatch ? gameFilterMatch[1].trim() : undefined,
    autoDiscover: autoDiscoverMatch ? autoDiscoverMatch[1].toLowerCase() === 'true' : true, // Default to true
    discoveryDepth: discoveryDepthMatch ? parseInt(discoveryDepthMatch[1]) : 2, // Default to 2
    keywordFilters
  };
  
  return monitorCommandSchema.parse(options);
}
