import { useState, KeyboardEvent, ChangeEvent } from 'react';
import { useBot } from '@/context/BotContext';
import { Button } from '@/components/ui/button';

export default function MessageInput() {
  const [message, setMessage] = useState('');
  const { sendMessage, currentChannel, triggerAutoDiscovery } = useBot();
  
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };
  
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && message.trim()) {
      sendMessage(message);
      setMessage('');
    }
  };
  
  return (
    <div className="px-4 pb-6 pt-3">
      <div className="relative flex items-center">
        <button className="absolute left-4 text-[#72767D] hover:text-gray-300 z-10">
          <i className="fas fa-plus-circle"></i>
        </button>
        
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder={`Message #${currentChannel?.name || 'channel'}`}
            className="w-full bg-[#40444B] rounded-md py-2.5 pl-10 pr-10 text-gray-200 placeholder-[#72767D] focus:outline-none"
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
          />
          
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 text-[#72767D]">
            <i className="fas fa-gift hover:text-gray-300 cursor-pointer"></i>
            <i className="fas fa-gif hover:text-gray-300 cursor-pointer"></i>
            <i className="fas fa-sticky-note hover:text-gray-300 cursor-pointer"></i>
            <i className="far fa-smile hover:text-gray-300 cursor-pointer"></i>
          </div>
        </div>
      </div>
      
      <div className="mt-2 flex items-center justify-between">
        <div className="px-1 text-xs text-[#72767D]">
          <span>You can also use <code>/commands</code> to interact with the bot</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs text-[#72767D] hover:text-white hover:bg-[#36393F] border-[#40444B]"
          onClick={() => triggerAutoDiscovery()}
        >
          Auto-Discover Pet Simulator 99 Content
        </Button>
      </div>
    </div>
  );
}
