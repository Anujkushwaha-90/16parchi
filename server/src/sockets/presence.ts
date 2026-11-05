import { Server } from 'socket.io';

/**
 * Real-time User Presence Tracker
 * Authoritative tracking across Socket.IO connections & serverless HTTP activity
 */

let ioInstance: Server | null = null;
const activeOnlineUsers = new Set<string>();

export const setPresenceIO = (io: Server) => {
  ioInstance = io;
};

export const isUserOnline = (
  userId?: string | null,
  dbIsOnline?: boolean | null,
  lastSeenAt?: Date | string | null
): boolean => {
  if (!userId) return false;

  // 1. In-memory Socket.IO connection check (authoritative if socket is actively connected)
  if (ioInstance) {
    const room = ioInstance.sockets.adapter.rooms.get(`user:${userId}`);
    if (room && room.size > 0) return true;
  }
  if (activeOnlineUsers.has(userId)) return true;

  // 2. Authoritative Activity Check: If user was active within the last 3 minutes (180,000 ms),
  // they are definitively online in the app
  if (lastSeenAt) {
    const diffMs = Date.now() - new Date(lastSeenAt).getTime();
    if (diffMs < 3 * 60 * 1000) {
      return true;
    }
  }

  // 3. Database flag fallback: If marked online in DB and within 10 minutes
  if (dbIsOnline) {
    if (!lastSeenAt) return true;
    const diffMs = Date.now() - new Date(lastSeenAt).getTime();
    if (diffMs < 10 * 60 * 1000) {
      return true;
    }
  }

  return false;
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

export const broadcastUserAvatar = (userId: string, avatarUrl: string) => {
  if (ioInstance && userId) {
    ioInstance.emit('user:avatar_updated', { userId, avatarUrl });
  }
};

export const sendToUser = (userId: string, event: string, data: any) => {
  if (ioInstance && userId) {
    ioInstance.to(`user:${userId}`).emit(event, data);
  }
};

export const broadcastPresence = (userId: string, isOnline: boolean) => {
  if (ioInstance && userId) {
    ioInstance.emit('presence:update', { userId, isOnline });
  }
};
