import { formatDistanceToNow } from 'date-fns';
import { Message } from '@/types/discord';

interface UserUploadMessageProps {
  message: Message;
}

export default function UserUploadMessage({ message }: UserUploadMessageProps) {
  const formatTimeAgo = (date: Date) => {
    return `Today at ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    })}`;
  };
  
  // Get avatar color
  const avatarColor = message.user.avatarColor || '#22c55e';
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Get icon for file type
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (['png', 'jpg', 'jpeg', 'gif'].includes(extension)) {
      return 'fa-file-image';
    } else if (['lua'].includes(extension)) {
      return 'fa-file-code';
    } else if (['rbxm', 'rbxl'].includes(extension)) {
      return 'fa-cube';
    } else if (['obj', 'fbx'].includes(extension)) {
      return 'fa-shapes';
    } else if (['mp3', 'wav'].includes(extension)) {
      return 'fa-file-audio';
    } else if (['txt', 'json', 'xml'].includes(extension)) {
      return 'fa-file-alt';
    }
    
    return 'fa-file';
  };
  
  return (
    <div className="flex mb-4 group">
      <div className="mr-4 mt-0.5">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center`} style={{ backgroundColor: avatarColor }}>
          <span className="text-white font-bold">{message.user.username.charAt(0)}</span>
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-baseline">
          <span className="font-medium mr-2" style={{ color: avatarColor }}>{message.user.username}</span>
          <span className="text-xs text-[#72767D]">{formatTimeAgo(message.timestamp)}</span>
          <div className="ml-2 hidden group-hover:flex text-[#72767D] text-xs">
            <i className="fas fa-reply cursor-pointer mx-1 hover:text-white"></i>
            <i className="fas fa-edit cursor-pointer mx-1 hover:text-white"></i>
            <i className="fas fa-trash-alt cursor-pointer mx-1 hover:text-white"></i>
            <i className="fas fa-ellipsis-h cursor-pointer mx-1 hover:text-white"></i>
          </div>
        </div>
        <div className="mt-1 text-gray-100">
          {message.attachment && (
            <div className="flex items-center">
              <div className="bg-[#202225] rounded p-2 flex items-center">
                <i className={`fas ${getFileIcon(message.attachment.filename)} text-[#5865F2] mr-2`}></i>
                <div>
                  <p className="text-sm">{message.attachment.filename}</p>
                  <p className="text-xs text-[#72767D]">{formatFileSize(message.attachment.size)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
