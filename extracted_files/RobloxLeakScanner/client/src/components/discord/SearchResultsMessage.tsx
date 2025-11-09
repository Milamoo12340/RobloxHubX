import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Message, SearchResult } from '@/types/discord';
import { useBot } from '@/context/BotContext';

interface SearchResultsMessageProps {
  message: Message;
}

export default function SearchResultsMessage({ message }: SearchResultsMessageProps) {
  const { searchLeaks, allTags } = useBot();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (message.commandResult) {
      // Transform the search results into a format we can use
      const formattedResults = message.commandResult.map((leak: any) => ({
        id: leak.id.toString(),
        title: leak.title,
        fileType: leak.file.fileType,
        assetId: leak.file.assetId,
        fileSize: leak.file.fileSize,
        tags: leak.tags,
        iconType: getIconForLeakType(leak.leakType)
      }));
      
      setSearchResults(formattedResults);
      setIsLoading(false);
    } else if (message.type === 'search') {
      // Extract search query from command content
      const content = message.content || '';
      const queryMatch = content.match(/query:\s*([^\s]+)/i);
      const categoryMatch = content.match(/category:\s*(\w+)/i);
      
      if (queryMatch) {
        const query = queryMatch[1];
        const category = categoryMatch ? categoryMatch[1] : undefined;
        
        performSearch(query, category);
      }
    }
  }, [message]);
  
  const performSearch = async (query: string, category?: string) => {
    setIsLoading(true);
    try {
      const results = await searchLeaks(query, category);
      
      // Format results
      const formattedResults = results.map((leak: any) => ({
        id: leak.id.toString(),
        title: leak.title,
        fileType: leak.file.fileType,
        assetId: leak.file.assetId,
        fileSize: leak.file.fileSize,
        tags: leak.tags,
        iconType: getIconForLeakType(leak.leakType)
      }));
      
      setSearchResults(formattedResults);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatTimeAgo = (date: Date) => {
    return `Today at ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    })}`;
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Get tag color
  const getTagColor = (tagName: string) => {
    const tag = allTags.find(t => t.name === tagName);
    return tag?.color || '#3b82f6';
  };
  
  // Get icon for leak type
  const getIconForLeakType = (leakType: string) => {
    switch (leakType) {
      case 'asset':
        return 'fa-file-image';
      case 'script':
        return 'fa-file-code';
      case 'model':
        return 'fa-cube';
      case 'map':
        return 'fa-map-marker-alt';
      case 'audio':
        return 'fa-file-audio';
      default:
        return 'fa-file';
    }
  };
  
  // Extract query from the message or command result
  const extractSearchQuery = () => {
    if (message.commandResult && message.commandResult.query) {
      return message.commandResult.query;
    }
    
    // Try to extract from content
    const content = message.content || '';
    const queryMatch = content.match(/query:\s*([^\s]+)/i);
    return queryMatch ? queryMatch[1] : 'search term';
  };
  
  // Extract category from the message or command result
  const extractSearchCategory = () => {
    if (message.commandResult && message.commandResult.category) {
      return message.commandResult.category;
    }
    
    // Try to extract from content
    const content = message.content || '';
    const categoryMatch = content.match(/category:\s*(\w+)/i);
    return categoryMatch ? categoryMatch[1] : 'Assets';
  };
  
  return (
    <div className="flex mb-4 group">
      <div className="mr-4 mt-0.5">
        <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center">
          <i className="fas fa-robot text-white"></i>
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-baseline">
          <span className="font-medium text-white mr-2">{message.user.username}</span>
          <span className="text-xs text-[#72767D]">{formatTimeAgo(message.timestamp)}</span>
          <div className="ml-2 hidden group-hover:flex text-[#72767D] text-xs">
            <i className="fas fa-reply cursor-pointer mx-1 hover:text-white"></i>
            <i className="fas fa-edit cursor-pointer mx-1 hover:text-white"></i>
            <i className="fas fa-trash-alt cursor-pointer mx-1 hover:text-white"></i>
            <i className="fas fa-ellipsis-h cursor-pointer mx-1 hover:text-white"></i>
          </div>
        </div>
        <div className="mt-1 text-gray-300">
          <div className="bg-[#202225] p-4 rounded">
            <div className="flex items-center mb-3">
              <i className="fas fa-search text-[#5865F2] mr-2"></i>
              <span className="font-medium">Search Results for "{extractSearchQuery()}" in {extractSearchCategory()}</span>
              <span className="ml-auto text-[#72767D] text-sm">{searchResults.length} results found</span>
            </div>
            
            {isLoading ? (
              <div className="text-center py-4">
                <i className="fas fa-spinner fa-spin text-2xl text-[#5865F2]"></i>
                <p className="mt-2">Loading search results...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-4">
                <i className="fas fa-search text-2xl text-[#72767D]"></i>
                <p className="mt-2">No results found</p>
              </div>
            ) : (
              searchResults.map((result) => (
                <div key={result.id} className="mb-3 p-3 bg-[#36393F] rounded flex hover:bg-[#40444B] cursor-pointer">
                  <div className="mr-3 bg-[#2F3136] h-16 w-16 flex items-center justify-center rounded">
                    <i className={`fas ${result.iconType} text-[#5865F2] text-2xl`}></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4 className="font-semibold">{result.title}</h4>
                      <span className="text-xs text-[#72767D]">{result.assetId}</span>
                    </div>
                    <p className="text-sm text-[#72767D] mt-1">
                      {result.fileType.toUpperCase()} - {formatFileSize(result.fileSize)}
                    </p>
                    <div className="mt-1 flex flex-wrap">
                      {result.tags.map((tag, index) => (
                        <span 
                          key={index} 
                          className="bg-opacity-20 text-xs px-1.5 py-0.5 rounded mr-1 mb-1"
                          style={{ 
                            backgroundColor: `${getTagColor(tag)}30`,
                            color: getTagColor(tag)
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            <div className="mt-4 flex justify-between">
              <button className="bg-[#40444B] hover:bg-opacity-80 text-white py-1 px-3 rounded text-sm">
                <i className="fas fa-filter mr-1"></i> Filter
              </button>
              <div>
                <button className="bg-[#40444B] hover:bg-opacity-80 text-white py-1 px-3 rounded text-sm mr-2" disabled>
                  <i className="fas fa-chevron-left mr-1"></i> Previous
                </button>
                <button 
                  className={`bg-[#5865F2] hover:bg-opacity-80 text-white py-1 px-3 rounded text-sm ${searchResults.length <= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={searchResults.length <= 3}
                >
                  Next <i className="fas fa-chevron-right ml-1"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
