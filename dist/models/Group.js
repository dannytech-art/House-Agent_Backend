import DatabaseService from '../services/database.service.js';
class GroupModel extends DatabaseService {
    constructor() {
        super('groups');
    }
    findByMember(userId) {
        return this.findMany(group => group.members.some(member => member.id === userId));
    }
    findByCreator(userId) {
        return this.findMany(group => group.createdBy === userId);
    }
}
class GroupMessageModel extends DatabaseService {
    constructor() {
        super('group_messages');
    }
    findByGroup(groupId) {
        return this.findMany(message => message.groupId === groupId)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
}
export const groupModel = new GroupModel();
export const groupMessageModel = new GroupMessageModel();
export default { groupModel, groupMessageModel };
//# sourceMappingURL=Group.js.map