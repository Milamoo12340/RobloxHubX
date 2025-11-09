import { useBot } from '@/context/BotContext';

export default function ServerList() {
  const { servers, selectServer } = useBot();
  
  const handleServerClick = (serverId: string) => {
    selectServer(serverId);
  };
  
  return (
    <div className="bg-[#202225] w-[72px] flex-shrink-0 h-full py-3 flex flex-col items-center gap-2 overflow-y-auto">
      {/* Home Button */}
      <div 
        className={`h-12 w-12 bg-[#36393F] rounded-[50%] flex items-center justify-center mb-2 cursor-pointer hover:rounded-2xl transition-all duration-200 ${servers[0].selected ? 'rounded-2xl bg-[#5865F2]' : ''}`}
        onClick={() => handleServerClick(servers[0].id)}
      >
        <i className="fa-brands fa-discord text-[#5865F2] text-[24px]"></i>
      </div>
      
      <div className="w-full h-[2px] bg-[#40444B] mx-auto mb-2"></div>
      
      {/* Servers */}
      {servers.slice(1).map((server) => (
        <div 
          key={server.id}
          className={`h-12 w-12 ${server.selected ? 'rounded-2xl bg-[#5865F2]' : 'bg-[#2F3136] rounded-[50%] hover:rounded-2xl hover:bg-[#5865F2]'} flex items-center justify-center cursor-pointer relative group transition-all duration-200`}
          onClick={() => handleServerClick(server.id)}
        >
          {server.selected && (
            <span className="absolute -left-[16px] w-2 h-9 bg-white rounded-r-full"></span>
          )}
          <span className="text-white font-bold">{server.icon}</span>
        </div>
      ))}
      
      {/* Add Server Button */}
      <div className="h-12 w-12 bg-[#2F3136] rounded-[50%] flex items-center justify-center cursor-pointer hover:rounded-2xl transition-all duration-200 hover:bg-[#57F287] mt-2">
        <i className="fas fa-plus text-[#57F287] hover:text-white"></i>
      </div>
    </div>
  );
}
