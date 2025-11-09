import { Message } from '@/types/discord';

interface SystemMessageProps {
  message: Message;
}

export default function SystemMessage({ message }: SystemMessageProps) {
  return (
    <div className="flex items-center py-4 px-4 rounded bg-[#2F3136] bg-opacity-30 mb-4">
      <div className="mr-3 text-[#5865F2] text-xl">
        <i className="fas fa-robot"></i>
      </div>
      <div>
        <p className="text-[#5865F2] font-medium">{message.user.username}</p>
        <p className="text-gray-300">{message.content}</p>
      </div>
    </div>
  );
}
