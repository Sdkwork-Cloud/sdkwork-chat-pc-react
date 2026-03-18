

export type GroupRole = 'owner' | 'admin' | 'member';

export interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  role: GroupRole;
  isOnline?: boolean;
  joinTime?: string;
  muteEndTime?: string; 
}

export interface GroupNotice {
  id: string;
  groupId: string;
  content: string;
  publisherId: string;
  publisherName: string;
  publishTime: string;
  isPinned: boolean;
}

export interface GroupSettings {
  allowInvite: boolean; 
  allowMemberModify: boolean; 
  needVerify: boolean; 
  showMemberCount: boolean; 
}

export interface Group {
  id: string;
  name: string;
  avatar: string;
  memberCount: number;
  maxMembers?: number;
  description?: string;
  creatorId: string;
  ownerId: string;
  members: GroupMember[];
  createdAt: string;
  updatedAt?: string;
  settings: GroupSettings;
  notices: GroupNotice[];
}

export interface CreateGroupFormData {
  name: string;
  description?: string;
  selectedMemberIds: string[];
}

export interface GroupSearchResult {
  groups: Group[];
  total: number;
}
