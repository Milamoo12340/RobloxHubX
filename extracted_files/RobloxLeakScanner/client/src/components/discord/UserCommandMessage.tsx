import { formatDistanceToNow } from 'date-fns';
import { Message } from '@/types/discord';

interface UserCommandMessageProps {
  message: Message;
}

export default function UserCommandMessage({ message }: UserCommandMessageProps) {
  const formatTimeAgo = (date: Date) => {
    return `Today at ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    })}`;
  };
  
  // Get avatar color
  const avatarColor = message.user.avatarColor || '#22c55e';
  // Format the command as it would appear in Discord
  const formatCommand = (command: string) => {
    const parts = command.split(' ');
    const commandName = parts[0];
    const args = parts.slice(1).join(' ');
    
    return (
      <div className="bg-[#40444B] rounded p-1.5 px-2.5 inline-block">
        <span className="text-[#5865F2] font-semibold">{commandName}</span> {args}
      </div>
    );
  };
  
  return (
    <div className="flex mb-4 group">
      <div className="mr-4 mt-0.5">
        <div className={`w-10 h-10 rounded-full bg-${avatarColor} flex items-center justify-center`} style={{ backgroundColor: avatarColor }}>
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
          {formatCommand(message.content)}
        </div>
      </div>
    </div>
  );
}
