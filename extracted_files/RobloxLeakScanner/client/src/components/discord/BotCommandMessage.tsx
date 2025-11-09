import { formatDistanceToNow } from 'date-fns';
import { Message } from '@/types/discord';

interface BotCommandMessageProps {
  message: Message;
}

export default function BotCommandMessage({ message }: BotCommandMessageProps) {
  // Format the help message display
  const formatHelpMessage = (commandResult: any) => {
    if (!commandResult || !commandResult.commands) return null;
    
    return (
      <div className="bg-[#202225] rounded p-3 border-l-4 border-[#5865F2]">
        <p className="font-bold text-[#5865F2]">{commandResult.title}</p>
        <div className="mt-2 space-y-2">
          {commandResult.commands.map((cmd: any, index: number) => (
            <p key={index}><code>{cmd.name}</code> - {cmd.description}</p>
          ))}
        </div>
      </div>
    );
  };
  
  const formatTimeAgo = (date: Date) => {
    return `Today at ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    })}`;
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
          {message.content && <p>{message.content}</p>}
          {message.commandResult && formatHelpMessage(message.commandResult)}
        </div>
      </div>
    </div>
  );
}
