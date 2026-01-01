import DatabaseService from '../services/database.service.js';
import { Group, GroupMessage } from '../types/index.js';

export interface GroupDocument extends Group {
  createdAt: string;
}

export interface GroupMessageDocument extends GroupMessage {
  createdAt: string;
}

class GroupModel extends DatabaseService<GroupDocument> {
  constructor() {
    super('groups');
  }

  findByMember(userId: string): GroupDocument[] {
    return this.findMany(group => 
      group.members.some(member => member.id === userId)
    );
  }

  findByCreator(userId: string): GroupDocument[] {
    return this.findMany(group => group.createdBy === userId);
  }
}

class GroupMessageModel extends DatabaseService<GroupMessageDocument> {
  constructor() {
    super('group_messages');
  }

  findByGroup(groupId: string): GroupMessageDocument[] {
    return this.findMany(message => message.groupId === groupId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}

export const groupModel = new GroupModel();
export const groupMessageModel = new GroupMessageModel();
export default { groupModel, groupMessageModel };


