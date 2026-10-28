import React, { useState, useEffect } from 'react';
import { X, Send, Check, Users } from 'lucide-react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';
import { sound } from '../../services/sound.js';
import { Friend } from '../../types/index.js';

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
  isOpen,
  onClose,
  roomCode,
}) => {
  const { showToast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [invitedMap, setInvitedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    const fetchFriends = async () => {
      setLoading(true);
      try {
        const res = await api.getFriends();
        setFriends(res.friends || []);
      } catch (e) {
        showToast('Failed to load friends list', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendInvite = async (friendId: string, friendName: string) => {
    try {
      sound.playClick();
      await api.inviteFriendToRoom(roomCode, friendId);
      setInvitedMap((prev) => ({ ...prev, [friendId]: true }));
      showToast(`Room invitation sent to ${friendName}!`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to send invitation', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-table-surface border border-table-border rounded-3xl p-6 shadow-2xl">
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-ivory-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-gold-500/20 text-gold-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-ivory-100">Invite Friends</h3>
            <p className="text-xs text-stone-400">Invite friends directly to Room {roomCode}</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-stone-400">Loading friends...</div>
        ) : friends.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-stone-400 mb-2">You haven't added any friends yet.</p>
            <p className="text-[11px] text-stone-500">
              Share your room code <strong>{roomCode}</strong> or add friends from the Friends menu!
            </p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {friends.map((f) => {
              const isInvited = invitedMap[f.id];
              return (
                <div
                  key={f.id}
                  className="p-2.5 rounded-xl bg-table-card border border-table-border flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={f.avatarUrl}
                      alt={f.displayName}
                      className="w-8 h-8 rounded-full border border-gold-400/40 object-cover bg-emerald-950"
                    />
                    <div>
                      <div className="text-xs font-bold text-ivory-100">{f.displayName}</div>
                      <div className="text-[10px] text-stone-400 font-mono flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            f.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'
                          }`}
                        />
                        {f.isOnline ? 'Online' : 'Offline'} • {f.friendCode}
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={isInvited}
                    onClick={() => handleSendInvite(f.id, f.displayName)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isInvited
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 cursor-default'
                        : 'gold-gradient-btn'
                    }`}
                  >
                    {isInvited ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Invited</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Invite</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-table-border flex justify-end">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-stone-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
