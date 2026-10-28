import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useGameSocket } from '../context/SocketContext.js';
import { useToast } from '../context/ToastContext.js';
import { sound } from '../services/sound.js';
import { api } from '../services/api.js';
import { GameRoom, CustomDeckConfig } from '../types/index.js';
import { InviteFriendsModal } from '../components/Modals/InviteFriendsModal.js';
import {
  Crown,
  Copy,
  Check,
  Share2,
  Users,
  Play,
  LogOut,
  Bot,
  UserPlus,
  CheckCircle2,
  Clock,
  Layers,
  Settings,
  X,
} from 'lucide-react';

interface LobbyScreenProps {
  roomCode: string;
  onMatchStarted: () => void;
  onLeaveLobby: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomCode,
  onMatchStarted,
  onLeaveLobby,
}) => {
  const { user } = useAuth();
  const { joinRoomSocket, publicState } = useGameSocket();
  const { showToast } = useToast();

  const [room, setRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [showDeckPreview, setShowDeckPreview] = useState<boolean>(false);
  const [showCapacityModal, setShowCapacityModal] = useState<boolean>(false);
  const [starting, setStarting] = useState<boolean>(false);

  const fetchRoom = async () => {
    try {
      const res = await api.getRoom(roomCode);
      if (res.room) {
        setRoom(res.room);
        joinRoomSocket(res.room.id);

        // If game is already active or just started
        if (res.room.status === 'IN_GAME') {
          onMatchStarted();
        }
      }
    } catch (e: any) {
      showToast('Failed to load room details', 'error');
      onLeaveLobby();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, 2500);
    return () => clearInterval(interval);
  }, [roomCode]);

  // When socket announces match is active, transition to Game Table
  useEffect(() => {
    if (publicState && (publicState.status === 'ACTIVE' || publicState.status === 'DEALING')) {
      onMatchStarted();
    }
  }, [publicState]);

  if (loading || !room || !user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 border-4 border-gold-500/20 border-t-gold-400 rounded-full animate-spin mb-4" />
        <div className="text-sm font-bold text-stone-300">Entering table lobby...</div>
      </div>
    );
  }

  const isHost = room.hostId === user.id;
  const myMember = room.members.find((m) => m.userId === user.id || m.user?.id === user.id);
  const isReady = myMember ? myMember.isReady : false;

  const maxPlayers = room.maxPlayers || 4;
  const totalPlayers = room.members.length;
  const allReady = totalPlayers === maxPlayers && room.members.every((m) => m.isReady);

  // Parse custom deck config if present
  let customConfig: CustomDeckConfig | null = null;
  if (room.customDeckJson) {
    try {
      customConfig = JSON.parse(room.customDeckJson);
    } catch {}
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    sound.playClick();
    showToast('Room code copied to clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareLink = () => {
    const link = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    sound.playClick();
    showToast('Invite link copied!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleToggleReady = async () => {
    sound.playClick();
    try {
      const res = await api.toggleReady(room.code);
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          members: prev.members.map((m) =>
            m.userId === user.id || m.user?.id === user.id ? { ...m, isReady: res.isReady } : m
          ),
        };
      });
      showToast(res.isReady ? 'You are ready!' : 'Marked not ready', 'info');
    } catch (e: any) {
      showToast('Failed to update ready status', 'error');
    }
  };

  const handleAddBot = async (seatIndex: number) => {
    sound.playClick();
    try {
      const res = await api.manageBot(room.code, 'add', seatIndex);
      if (res.room) setRoom(res.room);
      showToast('AI Bot added to seat', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to add bot', 'error');
    }
  };

  const handleRemoveBot = async (seatIndex: number) => {
    sound.playClick();
    try {
      const res = await api.manageBot(room.code, 'remove', seatIndex);
      if (res.room) setRoom(res.room);
      showToast('AI Bot removed', 'info');
    } catch (e: any) {
      showToast(e.message || 'Failed to remove bot', 'error');
    }
  };

  const handleChangeCapacity = async (newCapacity: number) => {
    if (newCapacity < totalPlayers) {
      showToast(
        `Cannot reduce limit to ${newCapacity} because ${totalPlayers} players have already joined.`,
        'error'
      );
      return;
    }
    sound.playClick();
    try {
      const res = await api.updateRoomSettings(room.code, { maxPlayers: newCapacity });
      if (res.room) {
        setRoom(res.room);
        showToast(`Table capacity updated to ${newCapacity} players!`, 'success');
        setShowCapacityModal(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update capacity', 'error');
    }
  };

  const handleStartGame = async () => {
    if (!allReady || totalPlayers !== maxPlayers) return;
    sound.playDeclare();
    setStarting(true);
    try {
      await api.startMatch(room.code);
      onMatchStarted();
    } catch (e: any) {
      showToast(e.message || 'Failed to start match', 'error');
      setStarting(false);
    }
  };

  const handleLeaveRoom = async () => {
    sound.playClick();
    try {
      await api.leaveRoom(room.code);
      onLeaveLobby();
    } catch (e) {
      onLeaveLobby();
    }
  };

  // Build dynamic Seats array for room.maxPlayers
  const seats = Array.from({ length: maxPlayers }, (_, i) => i).map((seatIndex) => {
    const member = room.members.find((m) => m.seatIndex === seatIndex);
    return { seatIndex, member };
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Lobby Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-table-surface border border-table-border shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs uppercase font-bold tracking-wider text-stone-400">
              Lobby Room Code
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-mono font-bold">
              {maxPlayers} PLAYERS ({maxPlayers * 4} PARCHIS)
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gold-950 border border-gold-500/40 text-gold-300 font-mono font-bold">
              {customConfig && customConfig.isCustom
                ? `CUSTOM DECK (${customConfig.items.length} WORDS)`
                : `${room.cardTheme.toUpperCase()} THEME`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="font-mono text-3xl sm:text-4xl font-black text-gold-300 tracking-wider">
              {room.code}
            </h1>
            <button
              onClick={handleCopyCode}
              title="Copy Room Code"
              className="p-2 rounded-xl bg-table-card border border-table-border hover:border-gold-400 text-stone-300 hover:text-gold-400 transition-colors"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleShareLink}
              title="Share Invite Link"
              className="p-2 rounded-xl bg-table-card border border-table-border hover:border-gold-400 text-stone-300 hover:text-gold-400 transition-colors"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Deck preview button */}
            {customConfig && customConfig.isCustom && (
              <button
                onClick={() => setShowDeckPreview(true)}
                className="px-2.5 py-1.5 rounded-xl bg-table-card border border-table-border hover:border-gold-400 text-xs font-bold text-stone-300 hover:text-gold-300 flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-gold-400" />
                <span>Preview Deck</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          {/* Host edit capacity button */}
          {isHost && (
            <button
              onClick={() => setShowCapacityModal(true)}
              className="px-3 py-2 rounded-xl border border-table-border bg-table-card hover:border-gold-400 text-xs font-bold text-stone-300 hover:text-gold-300 flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-gold-400" />
              <span>Change Capacity ({maxPlayers})</span>
            </button>
          )}

          <button
            onClick={() => {
              sound.playClick();
              setShowInviteModal(true);
            }}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-table-border bg-table-card hover:bg-white/5 text-xs font-bold text-ivory-100 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4 text-gold-400" />
            <span>Invite Friends</span>
          </button>

          <button
            onClick={handleLeaveRoom}
            className="px-4 py-2 rounded-xl border border-table-border bg-white/5 hover:bg-red-950/30 text-xs font-bold text-stone-300 hover:text-red-400 flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Dynamic Seating Pods Table Layout */}
      <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-table-surface via-table-card to-emerald-950/20 border border-table-border shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-xl font-serif font-black text-ivory-100 flex items-center justify-center gap-2">
            <Users className="w-5 h-5 text-gold-400" />
            <span>
              Table Seats ({totalPlayers}/{maxPlayers} Players)
            </span>
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Circular passing order: Seat 1 &rarr; Seat 2 &rarr; ... &rarr; Seat {maxPlayers} &rarr; Seat 1
          </p>
        </div>

        {/* Dynamic Seats Grid */}
        <div
          className={`grid gap-4 ${
            maxPlayers <= 4
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
              : maxPlayers <= 6
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {seats.map(({ seatIndex, member }) => {
            const memberUserId = member?.userId || member?.user?.id;
            const isMe = member && memberUserId === user.id;
            const isSeatHost = member && memberUserId === room.hostId;

            return (
              <div
                key={seatIndex}
                className={`relative p-5 rounded-3xl border flex flex-col justify-between transition-all ${
                  member
                    ? member.isReady
                      ? 'border-emerald-500/60 bg-emerald-950/30 shadow-emerald-glow'
                      : 'border-gold-500/40 bg-table-card'
                    : 'border-dashed border-table-border bg-table-dark/40'
                }`}
              >
                {/* Seat Badge */}
                <div className="flex items-center justify-between text-xs font-mono text-stone-400 mb-4">
                  <span className="font-bold text-stone-300">SEAT {seatIndex + 1}</span>
                  {member && isSeatHost && (
                    <span className="px-2 py-0.5 rounded-full bg-gold-500/20 border border-gold-500/40 text-gold-300 text-[10px] font-bold flex items-center gap-1">
                      <Crown className="w-3 h-3 text-gold-400" />
                      Host
                    </span>
                  )}
                  {member && member.isBot && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1">
                      <Bot className="w-3 h-3 text-cyan-400" />
                      AI Bot
                    </span>
                  )}
                </div>

                {/* Player Information or Empty Slot */}
                {member ? (
                  <div className="text-center py-2 space-y-2">
                    <div className="relative inline-block">
                      <img
                        src={
                          member.isBot
                            ? member.botAvatar ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=Bot${seatIndex}`
                            : member.user?.avatarUrl || ''
                        }
                        alt="Player"
                        className="w-16 h-16 rounded-2xl border-2 border-gold-400/60 object-cover bg-emerald-950 mx-auto shadow-md"
                      />
                      {member.isReady ? (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-table-dark flex items-center justify-center shadow">
                          <Clock className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-bold text-ivory-100 truncate">
                        {member.isBot ? member.botName : member.user?.displayName}
                        {isMe && <span className="text-gold-400 text-xs ml-1">(You)</span>}
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        {member.isBot ? 'AI Bot Player' : `@${member.user?.username}`}
                      </div>
                    </div>

                    {/* Ready Indicator */}
                    <div className="pt-2">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          member.isReady
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {member.isReady ? 'READY' : 'NOT READY'}
                      </span>
                    </div>

                    {/* Bot removal button if host */}
                    {isHost && member.isBot && (
                      <button
                        onClick={() => handleRemoveBot(seatIndex)}
                        className="text-[10px] text-stone-400 hover:text-red-400 pt-2 block mx-auto transition-colors"
                      >
                        Remove Bot
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-2xl border border-dashed border-table-border flex items-center justify-center mx-auto mb-3 text-stone-500">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="text-xs text-stone-400 font-semibold mb-3">Empty Seat</div>
                    {isHost && (
                      <button
                        onClick={() => handleAddBot(seatIndex)}
                        className="px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 mx-auto transition-colors"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>Add Bot</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Control Bar */}
        <div className="mt-10 pt-6 border-t border-table-border flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Ready status toggle */}
          <button
            onClick={handleToggleReady}
            className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              isReady
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-glow'
                : 'border border-gold-500/50 bg-gold-500/10 text-gold-300 hover:bg-gold-500/20'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isReady ? 'You are Ready! (Click to Unready)' : 'Click to Ready Up'}</span>
          </button>

          {/* Host Start Match Button */}
          {isHost ? (
            <button
              disabled={!allReady || starting}
              onClick={handleStartGame}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
                allReady && !starting
                  ? 'gold-gradient-btn shadow-gold-glow animate-pulse'
                  : 'bg-table-card border border-table-border text-stone-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>
                {starting
                  ? 'Starting Match...'
                  : totalPlayers < maxPlayers
                  ? `Need ${maxPlayers} Players (${totalPlayers}/${maxPlayers})`
                  : !allReady
                  ? 'Waiting for all players to Ready'
                  : `START ${maxPlayers * 4} PARCHI MATCH`}
              </span>
            </button>
          ) : (
            <div className="text-xs text-stone-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gold-400" />
              <span>Waiting for Host to start the match once everyone is ready...</span>
            </div>
          )}
        </div>
      </div>

      {/* Capacity Change Modal (Host Only) */}
      {showCapacityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-table-surface border border-table-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-table-border pb-3">
              <h3 className="text-base font-bold text-ivory-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-gold-400" />
                <span>Adjust Room Capacity</span>
              </h3>
              <button
                onClick={() => setShowCapacityModal(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-400">
              Select player capacity for this match (minimum 4, up to 8). You cannot set capacity lower
              than the current number of joined players ({totalPlayers}).
            </p>

            <div className="grid grid-cols-5 gap-2 pt-2">
              {[4, 5, 6, 7, 8].map((count) => {
                const disabled = count < totalPlayers;
                return (
                  <button
                    key={count}
                    disabled={disabled}
                    onClick={() => handleChangeCapacity(count)}
                    className={`py-3 rounded-2xl border text-center transition-all ${
                      count === maxPlayers
                        ? 'border-gold-500 bg-gold-500/20 text-gold-300 font-black ring-2 ring-gold-400/40'
                        : disabled
                        ? 'border-table-border bg-table-card/40 text-stone-600 cursor-not-allowed'
                        : 'border-table-border bg-table-card text-stone-300 hover:border-stone-500 font-bold'
                    }`}
                  >
                    <div className="text-lg">{count}</div>
                    <div className="text-[10px] text-stone-400">Seats</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Deck Preview Modal */}
      {showDeckPreview && customConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-table-surface border border-table-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-table-border pb-3">
              <h3 className="text-base font-bold text-ivory-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-gold-400" />
                <span>Custom Parchi Deck Preview</span>
              </h3>
              <button
                onClick={() => setShowDeckPreview(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {customConfig.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-table-card border border-table-border"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-gold-400 w-6">#{idx + 1}</span>
                    <span className="text-sm font-bold text-ivory-100">{item.name}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-stone-400 px-2 py-0.5 rounded bg-black/40">
                    {item.count} Parchis
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center text-xs font-mono text-stone-400">
              Total {customConfig.items.reduce((sum, it) => sum + it.count, 0)} parchis in deck
            </div>
          </div>
        </div>
      )}

      <InviteFriendsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        roomCode={room.code}
      />
    </div>
  );
};
