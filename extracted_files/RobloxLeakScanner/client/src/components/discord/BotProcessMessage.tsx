import { formatDistanceToNow } from 'date-fns';
import { Message } from '@/types/discord';
import { useBot } from '@/context/BotContext';

interface BotProcessMessageProps {
  message: Message;
}

export default function BotProcessMessage({ message }: BotProcessMessageProps) {
  const { sendCommand } = useBot();
  
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
  
  const handleLeakClick = async () => {
    if (!message.commandResult) return;
    
    const assetId = message.commandResult.assetId;
    const channelName = 'all-leaks';
    
    await sendCommand(`/leak id: ${assetId} channel: #${channelName}`);
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
            <div className="flex items-center">
              <i className="fas fa-check-circle text-[#57F287] mr-2"></i>
              <span className="font-medium">File uploaded successfully!</span>
            </div>
            <div className="mt-3">
              <p className="text-sm mb-2">File has been processed and categorized:</p>
              <div className="bg-[#36393F] p-3 rounded">
                <p><strong>Name:</strong> {message.commandResult?.filename}</p>
                <p><strong>Type:</strong> {message.commandResult?.fileType}</p>
                <p><strong>Size:</strong> {formatFileSize(message.commandResult?.fileSize || 0)}</p>
                <p><strong>ID:</strong> <code>{message.commandResult?.assetId}</code></p>
              </div>
            </div>
            <div className="mt-3 flex">
              <button 
                className="bg-[#5865F2] hover:bg-opacity-80 text-white py-1 px-3 rounded text-sm mr-2"
                onClick={handleLeakClick}
              >
                <i className="fas fa-share-alt mr-1"></i> Leak Now
              </button>
              <button className="bg-[#40444B] hover:bg-opacity-80 text-white py-1 px-3 rounded text-sm mr-2">
                <i className="fas fa-tag mr-1"></i> Change Category
              </button>
              <button className="bg-[#ED4245] hover:bg-opacity-80 text-white py-1 px-3 rounded text-sm">
                <i className="fas fa-trash mr-1"></i> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
