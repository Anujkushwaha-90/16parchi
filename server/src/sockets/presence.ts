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

export const isUserOnline = (
  userId?: string | null,
  dbIsOnline?: boolean | null,
  lastSeenAt?: Date | string | null
): boolean => {
  if (!userId) return false;

  // 1. In-memory Socket.IO connection check (for stateful servers)
  if (ioInstance) {
    const room = ioInstance.sockets.adapter.rooms.get(`user:${userId}`);
    if (room && room.size > 0) return true;
  }
  if (activeOnlineUsers.has(userId)) return true;

  // 2. Database heartbeat fallback (essential for serverless & cross-instance deployments)
  if (dbIsOnline) {
    if (!lastSeenAt) return true;
    const diffMs = Date.now() - new Date(lastSeenAt).getTime();
    // User is considered online if active within the last 5 minutes (300,000 ms)
    if (diffMs < 5 * 60 * 1000) {
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


