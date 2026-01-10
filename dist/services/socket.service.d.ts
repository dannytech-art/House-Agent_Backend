import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
/**
 * Initialize Socket.IO server
 */
export declare const initializeSocketServer: (httpServer: HttpServer) => SocketServer;
/**
 * Get Socket.IO instance
 */
export declare const getSocketServer: () => SocketServer | null;
/**
 * Emit event to a specific user
 */
export declare const emitToUser: (userId: string, event: string, data: any) => void;
/**
 * Emit event to a chat session
 */
export declare const emitToChat: (sessionId: string, event: string, data: any) => void;
/**
 * Check if user is online
 */
export declare const isUserOnline: (userId: string) => boolean;
/**
 * Get all online users
 */
export declare const getOnlineUsers: () => string[];
declare const _default: {
    initializeSocketServer: (httpServer: HttpServer) => SocketServer;
    getSocketServer: () => SocketServer | null;
    emitToUser: (userId: string, event: string, data: any) => void;
    emitToChat: (sessionId: string, event: string, data: any) => void;
    isUserOnline: (userId: string) => boolean;
    getOnlineUsers: () => string[];
};
export default _default;
//# sourceMappingURL=socket.service.d.ts.map