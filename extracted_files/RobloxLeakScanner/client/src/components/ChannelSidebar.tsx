import { useBot } from '@/context/BotContext';

export default function ChannelSidebar() {
  const { categories, currentServer, toggleCategory, selectChannel } = useBot();
  
  return (
    <div className="bg-[#2F3136] w-60 flex-shrink-0 h-full flex flex-col">
      {/* Server Header */}
      <div className="px-4 h-12 border-b border-[#202225] shadow-sm flex items-center font-bold cursor-pointer">
        <h1>{currentServer?.name || 'Discord Server'}</h1>
        <i className="fas fa-chevron-down ml-auto text-sm text-gray-400"></i>
      </div>
      
      {/* Channels */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {categories.map((category) => (
          <div key={category.id}>
            {/* Category Header */}
            <div 
              className="text-[#72767D] uppercase text-xs font-semibold px-2 mt-4 mb-1 flex items-center justify-between cursor-pointer"
              onClick={() => toggleCategory(category.id)}
            >
              <span>{category.name}</span>
              <i className={`fas fa-chevron-down text-[10px] transition-transform duration-200 ${category.expanded ? '' : 'transform rotate-180'}`}></i>
            </div>
            
            {/* Category Channels */}
            {category.expanded && category.channels.map((channel) => (
              <div 
                key={channel.id}
                className={`${channel.selected ? 'text-white bg-[#40444B]' : 'text-[#72767D] hover:text-gray-300 hover:bg-[#40444B]'} py-1 px-2 rounded flex items-center cursor-pointer`}
                onClick={() => selectChannel(channel.id)}
              >
                <i className="fas fa-hashtag mr-1.5 text-sm"></i>
                <span>{channel.name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      
      {/* User Info Footer */}
      <div className="bg-[#202225] h-14 px-2 flex items-center">
        <div className="w-8 h-8 rounded-full bg-[#5865F2] flex-shrink-0 flex items-center justify-center">
          <span className="text-white text-sm font-bold">U</span>
        </div>
        <div className="ml-2 flex-1">
          <div className="text-white text-sm font-semibold">Username</div>
          <div className="text-[#72767D] text-xs">#1234</div>
        </div>
        <div className="flex text-[#72767D] text-lg">
          <i className="fas fa-microphone-slash mx-2 cursor-pointer hover:text-gray-300"></i>
          <i className="fas fa-headphones mx-2 cursor-pointer hover:text-gray-300"></i>
          <i className="fas fa-cog mx-2 cursor-pointer hover:text-gray-300"></i>
        </div>
      </div>
    </div>
  );
}
