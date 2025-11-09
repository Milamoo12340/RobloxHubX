import { formatDistanceToNow } from 'date-fns';
import { Message } from '@/types/discord';
import { useBot } from '@/context/BotContext';

interface BotLeakMessageProps {
  message: Message;
}

export default function BotLeakMessage({ message }: BotLeakMessageProps) {
  const { allTags } = useBot();
  
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
  
  // Get appropriate icon for leak type
  const getLeakIcon = (leakType: string) => {
    switch (leakType) {
      case 'model':
        return 'fa-cube';
      case 'script':
        return 'fa-code';
      case 'map':
        return 'fa-map';
      case 'audio':
        return 'fa-music';
      case 'asset':
      case 'texture':
        return 'fa-image';
      default:
        return 'fa-file';
    }
  };
  
  // Get title from leak
  const leakTitle = message.commandResult?.title || "New Roblox Asset";
  
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
          <div className="border border-[#40444B] rounded-md overflow-hidden">
            <div className="bg-[#40444B] px-4 py-2 flex items-center">
              <i className="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>
              <span className="font-bold">LEAKED ASSET</span>
              <span className="ml-auto text-[#72767D] text-sm">ID: {message.commandResult?.assetId}</span>
            </div>
            <div className="p-4 bg-[#202225]">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/3 md:pr-4 mb-4 md:mb-0">
                  <div className="bg-[#40444B] rounded-md p-2 flex items-center justify-center h-48">
                    <div className="bg-[#36393F] p-4 rounded flex items-center justify-center">
                      <i className={`fas ${getLeakIcon(message.commandResult?.leakType || 'other')} text-6xl text-[#5865F2]`}></i>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {message.commandResult?.tags?.map((tag: string, index: number) => (
                      <span 
                        key={index} 
                        className="bg-opacity-30 text-xs px-2 py-1 rounded"
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
                <div className="md:w-2/3">
                  <h3 className="text-xl font-semibold mb-2">{leakTitle}</h3>
                  <div className="bg-[#36393F] rounded p-3 mb-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[#72767D] text-sm">File Name:</p>
                        <p>{message.commandResult?.filename}</p>
                      </div>
                      <div>
                        <p className="text-[#72767D] text-sm">Size:</p>
                        <p>{formatFileSize(message.commandResult?.fileSize || 0)}</p>
                      </div>
                      <div>
                        <p className="text-[#72767D] text-sm">Leaked By:</p>
                        <p>{message.commandResult?.leakedByUser || 'Username'}</p>
                      </div>
                      <div>
                        <p className="text-[#72767D] text-sm">Date:</p>
                        <p>{formatTimeAgo(message.timestamp)}</p>
                      </div>
                      <div>
                        <p className="text-[#72767D] text-sm">Game:</p>
                        <p>{message.commandResult?.gameName || 'Unspecified'}</p>
                      </div>
                      <div>
                        <p className="text-[#72767D] text-sm">Category:</p>
                        <p>{message.commandResult?.category}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm mb-3">{message.commandResult?.description || `${leakTitle} extracted from Roblox game files.`}</p>
                  <div className="flex gap-2">
                    <button className="bg-[#5865F2] hover:bg-opacity-80 text-white py-1 px-3 rounded text-sm">
                      <i className="fas fa-download mr-1"></i> Download
                    </button>
                    <button className="bg-[#40444B] hover:bg-opacity-80 text-white py-1 px-3 rounded text-sm">
                      <i className="fas fa-code mr-1"></i> View Details
                    </button>
                    <button className="bg-yellow-600 hover:bg-opacity-80 text-white py-1 px-3 rounded text-sm">
                      <i className="fas fa-bookmark mr-1"></i> Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 text-sm">
            <span className="text-[#72767D]">Leaked in <span className="text-[#5865F2]">#all-leaks</span>. Use <code>/search {message.commandResult?.leakType || 'asset'}</code> to find similar leaks.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
