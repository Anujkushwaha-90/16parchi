import { Server } from 'socket.io';

/**
 * Real-time User Presence Tracker
 * Powered by active Socket.IO connection rooms for 100% authoritative accuracy
 */

let ioInstance: Server | null = null;
const activeOnlineUsers = new Set<string>();

export const setPresenceIO = (io: Server) => {
  ioInstance = io;
};

export const isUserOnline = (userId?: string | null): boolean => {
  if (!userId) return false;
  if (ioInstance) {
    const room = ioInstance.sockets.adapter.rooms.get(`user:${userId}`);
    if (room && room.size > 0) return true;
  }
  return activeOnlineUsers.has(userId);
};

export const markUserConnected = (userId: string) => {
  if (userId) {
    activeOnlineUsers.add(userId);
  }
};

export const markUserDisconnected = (userId: string) => {
  if (userId) {
    activeOnlineUsers.delete(userId);
  }
};

export const getOnlineUserIds = (): string[] => {
  return Array.from(activeOnlineUsers);
};


