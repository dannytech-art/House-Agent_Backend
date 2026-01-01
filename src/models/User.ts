import DatabaseService from '../services/database.service.js';
import { User, Agent } from '../types/index.js';

export interface UserDocument extends User {
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export interface AgentDocument extends Agent {
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

class UserModel extends DatabaseService<UserDocument | AgentDocument> {
  constructor() {
    super('users');
  }

  findByEmail(email: string): UserDocument | AgentDocument | undefined {
    return this.findOne(user => user.email.toLowerCase() === email.toLowerCase());
  }

  findAgents(): AgentDocument[] {
    return this.findMany(user => user.role === 'agent') as AgentDocument[];
  }

  findSeekers(): UserDocument[] {
    return this.findMany(user => user.role === 'seeker') as UserDocument[];
  }

  findAdmins(): UserDocument[] {
    return this.findMany(user => user.role === 'admin') as UserDocument[];
  }

  findActiveUsers(): (UserDocument | AgentDocument)[] {
    return this.findMany(user => user.active);
  }
}

export const userModel = new UserModel();
export default userModel;


