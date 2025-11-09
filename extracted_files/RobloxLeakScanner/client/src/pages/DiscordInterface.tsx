import { useEffect } from 'react';
import { useBot } from '@/context/BotContext';
import ServerList from '@/components/ServerList';
import ChannelSidebar from '@/components/ChannelSidebar';
import ChatArea from '@/components/ChatArea';

export default function DiscordInterface() {
  const { selectServer, selectChannel } = useBot();
  
  useEffect(() => {
    // Set default selections
    selectServer('roblox-leaks');
    selectChannel('all-leaks');
    
    // Fix body styles for Discord UI
    document.body.classList.add('bg-[#36393F]', 'text-white', 'overflow-hidden');
    
    return () => {
      // Clean up styles when unmounting
      document.body.classList.remove('bg-[#36393F]', 'text-white', 'overflow-hidden');
    };
  }, []);
  
  return (
    <div className="flex h-screen w-full">
      <ServerList />
      <ChannelSidebar />
      <ChatArea />
    </div>
  );
}
