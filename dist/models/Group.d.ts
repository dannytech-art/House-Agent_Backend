import DatabaseService from '../services/database.service.js';
import { Group, GroupMessage } from '../types/index.js';
export interface GroupDocument extends Group {
    createdAt: string;
}
export interface GroupMessageDocument extends GroupMessage {
    createdAt: string;
}
declare class GroupModel extends DatabaseService<GroupDocument> {
    constructor();
    findByMember(userId: string): GroupDocument[];
    findByCreator(userId: string): GroupDocument[];
}
declare class GroupMessageModel extends DatabaseService<GroupMessageDocument> {
    constructor();
    findByGroup(groupId: string): GroupMessageDocument[];
}
export declare const groupModel: GroupModel;
export declare const groupMessageModel: GroupMessageModel;
declare const _default: {
    groupModel: GroupModel;
    groupMessageModel: GroupMessageModel;
};
export default _default;
//# sourceMappingURL=Group.d.ts.map