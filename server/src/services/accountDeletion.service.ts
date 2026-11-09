import { prisma } from '../db.js';

export class AccountDeletionService {
  /**
   * Schedule account deletion with 24-hour grace period
   */
  public static async scheduleDeletion(userId: string): Promise<{ scheduledFor: Date }> {
    const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    await prisma.user.update({
      where: { id: userId },
      data: {
        isDeletionPending: true,
        deletionScheduledAt: scheduledFor,
      },
    });

    return { scheduledFor };
  }

  /**
   * Cancel scheduled deletion when user logs in within 24 hours
   */
  public static async cancelDeletion(userId: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        isDeletionPending: false,
        deletionScheduledAt: null,
      },
    });
  }

  /**
   * Permanently archive all information and remove from active user table
   */
  public static async archiveAndPurgeUser(
    userId: string,
    deletionIp?: string,
    reason: string = 'USER_REQUESTED_AFTER_24HR_GRACE'
  ): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          avatarHistory: {
            select: {
              id: true,
              avatarUrl: true,
              source: true,
              fileSize: true,
              createdAt: true,
            },
          },
          loginLogs: {
            take: 100,
            orderBy: { loggedInAt: 'desc' },
            select: {
              id: true,
              ipAddress: true,
              deviceType: true,
              browser: true,
              os: true,
              city: true,
              country: true,
              loggedInAt: true,
              durationSeconds: true,
            },
          },
          nameHistory: {
            select: {
              id: true,
              oldDisplayName: true,
              newDisplayName: true,
              changedAt: true,
            },
          },
          friendshipsInitiated: {
            select: {
              id: true,
              userBId: true,
              createdAt: true,
            },
          },
          friendshipsReceived: {
            select: {
              id: true,
              userAId: true,
              createdAt: true,
            },
          },
          matchPlayers: {
            take: 50,
            select: {
              id: true,
              matchId: true,
              finalRank: true,
              winningCards: true,
            },
          },
        },
      });

      if (!user) return false;

      const friendsSnapshot = [
        ...user.friendshipsInitiated.map((f) => ({ friendUserId: f.userBId, connectedAt: f.createdAt })),
        ...user.friendshipsReceived.map((f) => ({ friendUserId: f.userAId, connectedAt: f.createdAt })),
      ];

      const winRate =
        user.gamesPlayed > 0 ? Number(((user.gamesWon / user.gamesPlayed) * 100).toFixed(2)) : 0;

      // 1. Permanently Archive all information into DeletedAccount table
      await prisma.deletedAccount.create({
        data: {
          originalUserId: user.id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          friendCode: user.friendCode,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon,
          secondPlaceCount: user.secondPlaceCount,
          thirdPlaceCount: user.thirdPlaceCount,
          fourthPlaceCount: user.fourthPlaceCount,
          winRate,
          photosArchiveJson: JSON.stringify(user.avatarHistory || []),
          loginLogsArchiveJson: JSON.stringify(user.loginLogs || []),
          nameHistoryJson: JSON.stringify(user.nameHistory || []),
          matchesSnapshotJson: JSON.stringify(user.matchPlayers || []),
          friendsSnapshotJson: JSON.stringify(friendsSnapshot),
          accountCreatedAt: user.createdAt,
          deletionRequestedAt: user.deletionScheduledAt || new Date(),
          deletedAt: new Date(),
          deletionIp: deletionIp || null,
          reason,
        },
      });

      // 2. Completely delete from active User table (cascades active room seats, friendships, etc.)
      await prisma.user.delete({
        where: { id: userId },
      });

      return true;
    } catch (err) {
      console.error(`Failed to archive and purge user ${userId}:`, err);
      return false;
    }
  }

  /**
   * Process all accounts whose 24-hour grace period has expired without login
   */
  public static async processExpiredDeletions(): Promise<number> {
    try {
      const now = new Date();
      const expiredUsers = await prisma.user.findMany({
        where: {
          isDeletionPending: true,
          deletionScheduledAt: {
            lte: now,
          },
        },
        select: { id: true },
      });

      if (expiredUsers.length === 0) return 0;

      let purgedCount = 0;
      for (const u of expiredUsers) {
        const success = await this.archiveAndPurgeUser(u.id);
        if (success) purgedCount++;
      }

      if (purgedCount > 0) {
        console.log(`[Account Deletion Cron] Archived and purged ${purgedCount} expired user accounts.`);
      }
      return purgedCount;
    } catch (err) {
      console.error('Error processing expired account deletions:', err);
      return 0;
    }
  }
}
