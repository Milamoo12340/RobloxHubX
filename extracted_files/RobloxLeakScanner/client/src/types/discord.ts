export interface User {
  id: number;
  username: string;
  isBot?: boolean;
  avatarColor?: string;
}

export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  user: User;
  type: 'text' | 'command' | 'system' | 'upload' | 'leak' | 'search' | 'process';
  attachment?: Attachment;
  commandResult?: any;
}

export interface Attachment {
  filename: string;
  size: number;
  type: string;
  data?: string;
  assetId?: string;
}

export interface Server {
  id: string;
  name: string;
  icon: string;
  selected?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  category: string;
  selected?: boolean;
}

export interface Category {
  id: string;
  name: string;
  expanded?: boolean;
  channels: Channel[];
}

export interface Tag {
  name: string;
  color: string;
}

export interface SearchResult {
  id: string;
  title: string;
  fileType: string;
  assetId: string;
  fileSize: number;
  tags: Tag[];
  iconType?: string;
}

export interface LeakFile {
  id: number;
  fileId: number;
  title: string;
  description?: string;
  leakType: string;
  category: string;
  gameName?: string;
  leakDate: Date;
  leakedBy: number;
  tags: string[];
  channelId?: string;
  file?: {
    id: number;
    filename: string;
    fileType: string;
    fileSize: number;
    assetId: string;
  };
  leakedByUser?: string;
}
