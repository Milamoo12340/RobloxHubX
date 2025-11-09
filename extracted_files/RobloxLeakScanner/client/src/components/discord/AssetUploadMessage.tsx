import { formatDistanceToNow } from 'date-fns';
import { Message } from '@/types/discord';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useBot } from '@/context/BotContext';

interface AssetUploadMessageProps {
  message: Message;
}

export default function AssetUploadMessage({ message }: AssetUploadMessageProps) {
  const formatTimeAgo = (date: Date) => {
    return `Today at ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    })}`;
  };
  
  const {
    isDragging,
    isUploading,
    fileInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
    openFileSelector
  } = useFileUpload();
  
  // Extract file type from command result if available
  const fileType = message.commandResult?.mode || 'asset';
  
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
          <p>Please upload a Roblox {fileType} file:</p>
          <div 
            className={`mt-3 border-2 border-dashed ${isDragging ? 'border-[#5865F2]' : 'border-[#72767D]'} rounded-md p-8 text-center bg-[#40444B] bg-opacity-50`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <i className="fas fa-cloud-upload-alt text-4xl text-[#72767D] mb-3"></i>
            <p className="mb-2">Drag & drop files here or click to browse</p>
            <p className="text-xs text-[#72767D]">Supported formats: .rbxm, .rbxl, .png, .jpg, .obj, .fbx, .lua</p>
            <button 
              className={`mt-4 bg-[#5865F2] hover:bg-opacity-80 text-white py-2 px-4 rounded ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={openFileSelector}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Select Files'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileInputChange}
              accept=".rbxm,.rbxl,.png,.jpg,.jpeg,.obj,.fbx,.lua,.mp3,.wav,.txt,.json,.xml"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
