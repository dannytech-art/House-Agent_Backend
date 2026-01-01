import DatabaseService from '../services/database.service.js';
class UserModel extends DatabaseService {
    constructor() {
        super('users');
    }
    findByEmail(email) {
        return this.findOne(user => user.email.toLowerCase() === email.toLowerCase());
    }
    findAgents() {
        return this.findMany(user => user.role === 'agent');
    }
    findSeekers() {
        return this.findMany(user => user.role === 'seeker');
    }
    findAdmins() {
        return this.findMany(user => user.role === 'admin');
    }
    findActiveUsers() {
        return this.findMany(user => user.active);
    }
}
export const userModel = new UserModel();
export default userModel;
//# sourceMappingURL=User.js.map