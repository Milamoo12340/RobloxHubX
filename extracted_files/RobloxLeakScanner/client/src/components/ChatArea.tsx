import { useRef, useEffect } from 'react';
import { useBot } from '@/context/BotContext';
import MessageInput from '@/components/MessageInput';
import SystemMessage from '@/components/discord/SystemMessage';
import BotCommandMessage from '@/components/discord/BotCommandMessage';
import AssetUploadMessage from '@/components/discord/AssetUploadMessage';
import BotProcessMessage from '@/components/discord/BotProcessMessage';
import BotLeakMessage from '@/components/discord/BotLeakMessage';
import SearchResultsMessage from '@/components/discord/SearchResultsMessage';
import UserCommandMessage from '@/components/discord/UserCommandMessage';
import UserUploadMessage from '@/components/discord/UserUploadMessage';

export default function ChatArea() {
  const { messages, currentChannel } = useBot();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const renderMessage = (message: any) => {
    const { type, user } = message;
    
    if (user.isBot) {
      switch (type) {
        case 'system':
          return <SystemMessage message={message} key={message.id} />;
        
        case 'text':
        case 'command':
          return <BotCommandMessage message={message} key={message.id} />;
        
        case 'upload':
          return <AssetUploadMessage message={message} key={message.id} />;
        
        case 'process':
          return <BotProcessMessage message={message} key={message.id} />;
        
        case 'leak':
          return <BotLeakMessage message={message} key={message.id} />;
        
        case 'search':
          return <SearchResultsMessage message={message} key={message.id} />;
        
        default:
          return <BotCommandMessage message={message} key={message.id} />;
      }
    } else {
      // User messages
      switch (type) {
        case 'command':
          return <UserCommandMessage message={message} key={message.id} />;
        
        case 'upload':
          return <UserUploadMessage message={message} key={message.id} />;
        
        default:
          return <UserCommandMessage message={message} key={message.id} />;
      }
    }
  };
  
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Channel Header */}
      <div className="h-12 border-b border-[#202225] px-4 flex items-center shadow-sm">
        <i className="fas fa-hashtag text-[#72767D] mr-2"></i>
        <span className="font-bold">{currentChannel?.name || 'channel'}</span>
        <span className="text-[#72767D] pl-3 text-sm">
          {currentChannel?.name === 'all-leaks' ? 'Game leaks for all Roblox games' : 'Discord channel'}
        </span>
        
        <div className="ml-auto flex items-center space-x-4 text-[#72767D]">
          <i className="fas fa-bell hover:text-gray-300 cursor-pointer"></i>
          <i className="fas fa-thumbtack hover:text-gray-300 cursor-pointer"></i>
          <i className="fas fa-user-friends hover:text-gray-300 cursor-pointer"></i>
          <div className="relative">
            <input type="text" placeholder="Search" className="bg-[#202225] text-sm rounded-md py-1 px-2 w-40 focus:outline-none text-gray-300" />
            <i className="fas fa-search absolute right-2 top-1/2 transform -translate-y-1/2 text-xs"></i>
          </div>
          <i className="fas fa-inbox hover:text-gray-300 cursor-pointer"></i>
          <i className="fas fa-question-circle hover:text-gray-300 cursor-pointer"></i>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4" id="messagesContainer">
        {messages.map((message) => renderMessage(message))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <MessageInput />
    </div>
  );
}
