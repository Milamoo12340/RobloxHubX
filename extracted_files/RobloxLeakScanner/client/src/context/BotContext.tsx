import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Message, Server, Category, Channel, LeakFile, Tag } from '../types/discord';
import { nanoid } from 'nanoid';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface BotContextProps {
  currentUser: User;
  messages: Message[];
  servers: Server[];
  categories: Category[];
  currentServer: Server | null;
  currentChannel: Channel | null;
  allLeaks: LeakFile[];
  allTags: Tag[];
  sendMessage: (content: string) => void;
  sendCommand: (command: string) => Promise<any>;
  uploadFile: (file: File) => Promise<any>;
  searchLeaks: (query: string, category?: string) => Promise<any>;
  triggerAutoDiscovery: () => Promise<any>;
  clearMessages: () => void;
  selectServer: (serverId: string) => void;
  selectChannel: (channelId: string) => void;
  toggleCategory: (categoryId: string) => void;
}

const BotContext = createContext<BotContextProps | undefined>(undefined);

export const BotProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User>({
    id: 1,
    username: 'Username',
    avatarColor: '#22c55e'
  });
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [allLeaks, setAllLeaks] = useState<LeakFile[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  
  const [currentServer, setCurrentServer] = useState<Server | null>(null);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  
  const [servers, setServers] = useState<Server[]>([
    { id: 'home', name: 'Home', icon: 'discord', selected: false },
    { id: 'roblox-leaks', name: 'Roblox Leaks', icon: 'RL', selected: true },
    { id: 'server2', name: 'Discord Server', icon: 'DS', selected: false },
    { id: 'server3', name: 'Game Hub', icon: 'GH', selected: false },
  ]);
  
  const [categories, setCategories] = useState<Category[]>([
    {
      id: 'bot-commands',
      name: 'Bot Commands',
      expanded: true,
      channels: [
        { id: 'commands', name: 'commands', type: 'text', category: 'Bot Commands', selected: false },
        { id: 'bot-logs', name: 'bot-logs', type: 'text', category: 'Bot Commands', selected: false },
      ]
    },
    {
      id: 'game-leaks',
      name: 'Game Leaks',
      expanded: true,
      channels: [
        { id: 'all-leaks', name: 'all-leaks', type: 'text', category: 'Game Leaks', selected: true },
        { id: 'assets', name: 'assets', type: 'text', category: 'Game Leaks', selected: false },
        { id: 'scripts', name: 'scripts', type: 'text', category: 'Game Leaks', selected: false },
        { id: 'maps', name: 'maps', type: 'text', category: 'Game Leaks', selected: false },
        { id: 'models', name: 'models', type: 'text', category: 'Game Leaks', selected: false },
      ]
    },
    {
      id: 'community',
      name: 'Community',
      expanded: true,
      channels: [
        { id: 'general', name: 'general', type: 'text', category: 'Community', selected: false },
        { id: 'contributors', name: 'contributors', type: 'text', category: 'Community', selected: false },
      ]
    }
  ]);
  
  useEffect(() => {
    // Find selected server and channel
    const selectedServer = servers.find(s => s.selected);
    const selectedChannel = categories
      .flatMap(c => c.channels)
      .find(c => c.selected);
    
    setCurrentServer(selectedServer || null);
    setCurrentChannel(selectedChannel || null);
    
    // Initial system message
    if (messages.length === 0) {
      setMessages([
        {
          id: nanoid(),
          content: "Welcome to the Roblox Leaks server! Use `/help` to see available commands.",
          timestamp: new Date(),
          user: {
            id: 0,
            username: 'LeaksBot',
            isBot: true
          },
          type: 'system'
        }
      ]);
    }
    
    // Fetch tags
    fetchTags();
    
    // Fetch leaks
    fetchLeaks();
  }, []);
  
  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();
      
      if (data.success) {
        setAllTags(data.tags);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  };
  
  const fetchLeaks = async () => {
    try {
      const response = await fetch('/api/leaks');
      const data = await response.json();
      
      if (data.success) {
        setAllLeaks(data.leaks);
      }
    } catch (error) {
      console.error("Failed to fetch leaks:", error);
    }
  };
  
  const sendMessage = (content: string) => {
    if (!content.trim()) return;
    
    // Add user message
    const newMessage: Message = {
      id: nanoid(),
      content,
      timestamp: new Date(),
      user: currentUser,
      type: 'text'
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // If it's a command, process it
    if (content.startsWith('/')) {
      handleCommand(content);
    }
  };
  
  const sendCommand = async (command: string) => {
    try {
      const response = await apiRequest('POST', '/api/bot/command', {
        command,
        username: currentUser.username
      });
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      toast({
        title: "Command Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };
  
  const handleCommand = async (command: string) => {
    try {
      // Add user command message
      const userCommandMessage: Message = {
        id: nanoid(),
        content: command,
        timestamp: new Date(),
        user: currentUser,
        type: 'command'
      };
      
      setMessages(prev => [...prev, userCommandMessage]);
      
      // Handle specific commands
      if (command.startsWith('/discover')) {
        // If it's the discover command, use the direct API
        await triggerAutoDiscovery();
        return;
      }
      
      // Send command to server
      const data = await sendCommand(command);
      
      if (data.success) {
        // Add bot response message
        const botResponseMessage: Message = {
          id: nanoid(),
          content: "",
          timestamp: new Date(),
          user: {
            id: 0,
            username: 'LeaksBot',
            isBot: true
          },
          type: determineResponseType(command),
          commandResult: data.result
        };
        
        setMessages(prev => [...prev, botResponseMessage]);
        
        // If it's a leak command, refresh leaks list
        if (command.startsWith('/leak')) {
          fetchLeaks();
        }
      }
    } catch (error: any) {
      // Add error message
      const errorMessage: Message = {
        id: nanoid(),
        content: `Error: ${error.message}`,
        timestamp: new Date(),
        user: {
          id: 0,
          username: 'LeaksBot',
          isBot: true
        },
        type: 'system'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };
  
  const determineResponseType = (command: string): Message['type'] => {
    if (command.startsWith('/upload')) return 'upload';
    if (command.startsWith('/leak')) return 'leak';
    if (command.startsWith('/search')) return 'search';
    if (command.startsWith('/categorize')) return 'process';
    if (command.startsWith('/discover')) return 'process';
    return 'text';
  };
  
  const uploadFile = async (file: File) => {
    try {
      // Add file upload message from user
      const fileUploadMessage: Message = {
        id: nanoid(),
        content: '',
        timestamp: new Date(),
        user: currentUser,
        type: 'upload',
        attachment: {
          filename: file.name,
          size: file.size,
          type: file.type
        }
      };
      
      setMessages(prev => [...prev, fileUploadMessage]);
      
      // Read file as base64
      const reader = new FileReader();
      
      const fileDataPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64data = reader.result as string;
          resolve(base64data.split(',')[1]); // Remove data URL prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const fileData = await fileDataPromise;
      
      // Get file extension
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      
      // Upload to server
      const response = await apiRequest('POST', '/api/bot/upload', {
        fileName: file.name,
        fileSize: file.size,
        fileType: fileExt,
        fileData,
        username: currentUser.username
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Add processing message from bot
        const processMessage: Message = {
          id: nanoid(),
          content: '',
          timestamp: new Date(),
          user: {
            id: 0,
            username: 'LeaksBot',
            isBot: true
          },
          type: 'process',
          commandResult: data.file
        };
        
        setMessages(prev => [...prev, processMessage]);
        return data.file;
      }
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message,
        variant: "destructive"
      });
      
      // Add error message
      const errorMessage: Message = {
        id: nanoid(),
        content: `Error uploading file: ${error.message}`,
        timestamp: new Date(),
        user: {
          id: 0,
          username: 'LeaksBot',
          isBot: true
        },
        type: 'system'
      };
      
      setMessages(prev => [...prev, errorMessage]);
      throw error;
    }
  };
  
  const searchLeaks = async (query: string, category?: string) => {
    try {
      const url = new URL('/api/leaks/search', window.location.origin);
      url.searchParams.append('query', query);
      if (category) {
        url.searchParams.append('category', category);
      }
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (data.success) {
        return data.leaks;
      }
      
      return [];
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  };
  
  const triggerAutoDiscovery = async () => {
    try {
      // Add system message about discovery starting
      const startMessage: Message = {
        id: nanoid(),
        content: "Starting auto-discovery for Pet Simulator 99 content...",
        timestamp: new Date(),
        user: {
          id: 0,
          username: 'LeaksBot',
          isBot: true
        },
        type: 'system'
      };
      
      setMessages(prev => [...prev, startMessage]);
      
      // Call the discovery endpoint
      const response = await apiRequest('POST', '/api/bot/discover', {});
      const data = await response.json();
      
      if (data.success) {
        // Add success message
        const successMessage: Message = {
          id: nanoid(),
          content: `Auto-discovery complete! Found ${data.results?.length || 0} new items.`,
          timestamp: new Date(),
          user: {
            id: 0,
            username: 'LeaksBot',
            isBot: true
          },
          type: 'system'
        };
        
        setMessages(prev => [...prev, successMessage]);
        
        // Refresh leaks after discovery
        fetchLeaks();
        
        return data.results;
      }
      
      return null;
    } catch (error: any) {
      // Add error message
      const errorMessage: Message = {
        id: nanoid(),
        content: `Error running auto-discovery: ${error.message}`,
        timestamp: new Date(),
        user: {
          id: 0,
          username: 'LeaksBot',
          isBot: true
        },
        type: 'system'
      };
      
      setMessages(prev => [...prev, errorMessage]);
      console.error("Auto-discovery error:", error);
      
      toast({
        title: "Auto-Discovery Error",
        description: error.message,
        variant: "destructive"
      });
      
      return null;
    }
  };
  
  const clearMessages = () => {
    setMessages([]);
  };
  
  const selectServer = (serverId: string) => {
    setServers(prev => prev.map(server => ({
      ...server,
      selected: server.id === serverId
    })));
  };
  
  const selectChannel = (channelId: string) => {
    setCategories(prev => prev.map(category => ({
      ...category,
      channels: category.channels.map(channel => ({
        ...channel,
        selected: channel.id === channelId
      }))
    })));
  };
  
  const toggleCategory = (categoryId: string) => {
    setCategories(prev => prev.map(category => 
      category.id === categoryId ? 
        { ...category, expanded: !category.expanded } : 
        category
    ));
  };
  
  return (
    <BotContext.Provider
      value={{
        currentUser,
        messages,
        servers,
        categories,
        currentServer,
        currentChannel,
        allLeaks,
        allTags,
        sendMessage,
        sendCommand,
        uploadFile,
        searchLeaks,
        triggerAutoDiscovery,
        clearMessages,
        selectServer,
        selectChannel,
        toggleCategory
      }}
    >
      {children}
    </BotContext.Provider>
  );
};

export const useBot = () => {
  const context = useContext(BotContext);
  if (context === undefined) {
    throw new Error('useBot must be used within a BotProvider');
  }
  return context;
};
