import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { sound } from '../services/sound.js';
import { Crown, Check, X, Users, Sparkles } from 'lucide-react';

interface RoomInvite {
  id: string;
  roomId: string;
  inviterId: string;
  status: string;
  room: {
    code: string;
    maxPlayers: number;
    status: string;
  };
  inviter: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string;
  };
}

interface GlobalInviteBannerProps {
  currentScreen: string;
  onAcceptInvite: (roomCode: string) => void;
}

export const GlobalInviteBanner: React.FC<GlobalInviteBannerProps> = ({
  currentScreen,
  onAcceptInvite,
}) => {
  const { user } = useAuth();
  const [activeInvite, setActiveInvite] = useState<RoomInvite | null>(null);
  const [responding, setResponding] = useState<boolean>(false);
  const dismissedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setActiveInvite(null);
      return;
    }

    // Don't disturb during active game table
    if (currentScreen === 'table') {
      return;
    }

    let isMounted = true;

    const checkInvites = async () => {
      try {
        const res = await api.getPendingRoomInvites();
        if (!isMounted) return;

        const invites: RoomInvite[] = res.invites || [];
        const fresh = invites.find(
          (inv) =>
            !dismissedIdsRef.current.has(inv.id) &&
            inv.status === 'PENDING' &&
            inv.room?.status === 'LOBBY'
        );

        if (fresh) {
          if (!activeInvite || activeInvite.id !== fresh.id) {
            sound.playCardReceive();
            setActiveInvite(fresh);
          }
        } else if (activeInvite && !invites.some((i) => i.id === activeInvite.id)) {
          setActiveInvite(null);
        }
      } catch (err) {
        // Silent poll error
      }
    };

    checkInvites();
    const interval = setInterval(checkInvites, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, currentScreen, activeInvite]);

  if (!activeInvite) return null;

  const handleAccept = async () => {
    if (responding) return;
    setResponding(true);
    sound.playClick();
    const roomCode = activeInvite.room.code;
    const inviteId = activeInvite.id;
    dismissedIdsRef.current.add(inviteId);
    setActiveInvite(null);

    try {
      await api.respondToRoomInvite(inviteId, true);
    } catch {}

    onAcceptInvite(roomCode);
    setResponding(false);
  };

  const handleDecline = async () => {
    if (responding) return;
    setResponding(true);
    sound.playClick();
    const inviteId = activeInvite.id;
    dismissedIdsRef.current.add(inviteId);
    setActiveInvite(null);

    try {
      await api.respondToRoomInvite(inviteId, false);
    } catch {}

    setResponding(false);
  };

  return (
    <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-sm w-full animate-bounce-in">
      <div className="bg-table-surface/95 backdrop-blur-md border-2 border-gold-500/60 rounded-3xl p-5 shadow-2xl text-ivory-100 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-gold-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3.5 relative z-10">
          <img
            src={activeInvite.inviter.avatarUrl}
            alt={activeInvite.inviter.displayName}
            className="w-12 h-12 rounded-2xl bg-table-card border border-gold-500/40 object-cover shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-gold-400 text-xs font-bold uppercase tracking-wider mb-0.5">
              <Crown className="w-3.5 h-3.5" />
              <span>Royal Game Invite</span>
            </div>
            <p className="text-sm font-bold text-ivory-100 truncate">
              {activeInvite.inviter.displayName}
            </p>
            <p className="text-xs text-stone-400">
              Invited you to Room <span className="font-mono text-gold-400 font-bold">#{activeInvite.room.code}</span>
            </p>
          </div>

          <button
            onClick={handleDecline}
            disabled={responding}
            className="p-1 rounded-full text-stone-400 hover:text-ivory-100 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-table-border/60 relative z-10">
          <button
            onClick={handleAccept}
            disabled={responding}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-stone-950 font-black text-xs flex items-center justify-center gap-2 shadow-gold-glow transition-all active:scale-[0.98] cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Accept & Join Group</span>
          </button>

          <button
            onClick={handleDecline}
            disabled={responding}
            className="py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-stone-300 font-bold text-xs transition-colors cursor-pointer"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};
