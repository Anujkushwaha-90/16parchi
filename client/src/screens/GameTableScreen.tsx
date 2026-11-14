import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useGameSocket } from '../context/SocketContext.js';
import { useToast } from '../context/ToastContext.js';
import { sound } from '../services/sound.js';
import { api } from '../services/api.js';
import { Card } from '../components/Card.js';
import { UserProfileModal } from '../components/Modals/UserProfileModal.js';
import { isVipUser } from '../utils/vip.js';
import { isDuoMember, isDuoBoy, isDuoGirl } from '../utils/duo.js';
import { ParchiCard, PublicPlayerSeat } from '../types/index.js';
import { VOICE_TAUNTS, THROW_ITEMS, tauntService } from '../services/taunts.js';
import {
  Crown,
  Sparkles,
  ArrowRight,
  Send,
  MessageSquare,
  Clock,
  Trophy,
  Volume2,
  VolumeX,
  History,
  Bot,
  CheckCircle2,
  Smile,
  Flame,
  LogOut,
  AlertTriangle,
} from 'lucide-react';

interface GameTableScreenProps {
  roomCode?: string;
  onMatchFinished: () => void;
  onExitToLobby: () => void;
}

export const GameTableScreen: React.FC<GameTableScreenProps> = ({
  roomCode,
  onMatchFinished,
  onExitToLobby,
}) => {
  const { user } = useAuth();
  const {
    isConnected,
    publicState,
    privateState,
    passCard,
    declareWin,
    sendChatMessage,
    chatMessages,
    syncGameState,
    currentRoomId,
    joinRoomSocket,
    leaveRoomSocket,
    latestTaunt,
    sendTaunt,
  } = useGameSocket();
  const { showToast } = useToast();

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showTauntDrawer, setShowTauntDrawer] = useState(false);
  const [tauntTab, setTauntTab] = useState<'voice' | 'throw'>('voice');
  const [selectedThrowTarget, setSelectedThrowTarget] = useState<number | null>(null);
  const [activeSpeech, setActiveSpeech] = useState<{
    seatIndex: number;
    text: string;
    character: string;
  } | null>(null);
  const [flyingThrow, setFlyingThrow] = useState<{
    id: string;
    emoji: string;
    fromSeat: number;
    toSeat: number;
  } | null>(null);
  const [isTauntMuted, setIsTauntMuted] = useState<boolean>(tauntService.getTauntsMuted());
  const [lastTauntSentAt, setLastTauntSentAt] = useState<number>(0);
  const [passingCardId, setPassingCardId] = useState<string | null>(null);
  const [selectedProfilePlayer, setSelectedProfilePlayer] = useState<PublicPlayerSeat | null>(null);
  const [syncFailed, setSyncFailed] = useState<boolean>(false);
  const [syncRetries, setSyncRetries] = useState<number>(0);
  const [displayTime, setDisplayTime] = useState<number>(publicState?.timeRemaining ?? 60);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false);
  const [leavingMatch, setLeavingMatch] = useState<boolean>(false);

  // Sync smooth 1-second local countdown with authoritative server timeRemaining
  useEffect(() => {
    if (typeof publicState?.timeRemaining === 'number') {
      setDisplayTime(publicState.timeRemaining);
    }
  }, [publicState?.timeRemaining, publicState?.turnNumber, publicState?.activeSeat]);

  useEffect(() => {
    if (publicState?.status !== 'ACTIVE') return;
    const timer = setInterval(() => {
      setDisplayTime((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [publicState?.status, publicState?.turnNumber, publicState?.activeSeat]);

  // Auto-heal: If publicState or privateState is missing on mount, pull authoritative state via REST API
  useEffect(() => {
    if ((!publicState || !privateState) && roomCode) {
      let isSubscribed = true;
      syncGameState(roomCode).then((success) => {
        if (!success && isSubscribed) {
          const timer = setTimeout(() => {
            if (isSubscribed) {
              syncGameState(roomCode).then((secondTry) => {
                if (!secondTry && isSubscribed) {
                  setSyncFailed(true);
                }
              });
            }
          }, 1500);
          return () => clearTimeout(timer);
        }
      });
      return () => {
        isSubscribed = false;
      };
    }
  }, [publicState, privateState, roomCode, syncGameState, syncRetries]);

  // Ensure socket stays joined to the active room channel
  useEffect(() => {
    if (publicState?.roomId && currentRoomId !== publicState.roomId) {
      joinRoomSocket(publicState.roomId);
    }
  }, [publicState?.roomId, currentRoomId, joinRoomSocket]);

  // Safety fallback poll if socket is disconnected or local countdown hits 0
  useEffect(() => {
    const code = roomCode || publicState?.roomCode;
    if (!code) return;
    if (isConnected && !(publicState?.status === 'ACTIVE' && displayTime <= 0)) {
      return;
    }
    const timer = setInterval(() => {
      syncGameState(code);
    }, 2500);
    return () => clearInterval(timer);
  }, [isConnected, roomCode, publicState?.roomCode, publicState?.status, displayTime, syncGameState]);

  // If match status transitions to FINISHED
  useEffect(() => {
    if (publicState && publicState.status === 'FINISHED') {
      const timer = setTimeout(() => {
        onMatchFinished();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [publicState?.status]);

  // Handle Incoming Meme Taunts and Throw Projectiles
  useEffect(() => {
    if (!latestTaunt) return;

    if (latestTaunt.type === 'voice') {
      const taunt = VOICE_TAUNTS.find((t) => t.id === latestTaunt.tauntId);
      if (taunt) {
        setActiveSpeech({
          seatIndex: latestTaunt.senderSeatIndex,
          text: taunt.dialogue,
          character: taunt.character,
        });
        const timer = setTimeout(() => setActiveSpeech(null), 4000);
        return () => clearTimeout(timer);
      }
    } else if (latestTaunt.type === 'throw') {
      const item = THROW_ITEMS.find((t) => t.id === latestTaunt.tauntId);
      const targetSeat =
        typeof latestTaunt.targetSeatIndex === 'number'
          ? latestTaunt.targetSeatIndex
          : (latestTaunt.senderSeatIndex + 1) % (publicState?.playerCount || 4);

      setFlyingThrow({
        id: latestTaunt.id,
        emoji: item?.emoji || '🍅',
        fromSeat: latestTaunt.senderSeatIndex,
        toSeat: targetSeat,
      });

      const timer = setTimeout(() => setFlyingThrow(null), 1800);
      return () => clearTimeout(timer);
    }
  }, [latestTaunt, publicState?.playerCount]);

  const handleSendVoiceTaunt = (tauntId: string) => {
    const now = Date.now();
    if (now - lastTauntSentAt < 3500) {
      showToast('Chill karo bhidu! Thoda ruko (cooldown active).', 'info');
      return;
    }
    setLastTauntSentAt(now);
    sound.unlock();
    tauntService.playVoiceTaunt(tauntId);
    sendTaunt(tauntId, 'voice');
    setShowTauntDrawer(false);
  };

  const handleSendThrow = (itemId: string, targetSeatIndex?: number) => {
    const now = Date.now();
    if (now - lastTauntSentAt < 3500) {
      showToast('Chill karo bhidu! Thoda ruko (cooldown active).', 'info');
      return;
    }
    setLastTauntSentAt(now);

    const target =
      typeof targetSeatIndex === 'number'
        ? targetSeatIndex
        : selectedThrowTarget !== null
        ? selectedThrowTarget
        : (privateState?.mySeatIndex !== undefined ? (privateState.mySeatIndex + 1) % (publicState?.playerCount || 4) : 0);

    sound.unlock();
    const item = THROW_ITEMS.find((t) => t.id === itemId);
    if (item) {
      tauntService.playThrowSfx(item.sfx);
    }
    sendTaunt(itemId, 'throw', target);
    setShowTauntDrawer(false);
  };

  const handleToggleTauntMute = () => {
    sound.unlock();
    const next = tauntService.toggleTauntsMuted();
    setIsTauntMuted(next);
    if (!next) {
      sound.playClick();
    }
    showToast(next ? 'Meme voice taunts muted' : 'Meme voice taunts active!', 'info');
  };

  const handleConfirmLeaveMatch = async () => {
    if (!publicState) {
      onExitToLobby();
      return;
    }
    setLeavingMatch(true);
    sound.playClick();
    try {
      await api.leaveRoom(publicState.roomCode).catch(() => {});
    } finally {
      leaveRoomSocket(publicState.roomId);
      setShowLeaveConfirm(false);
      setLeavingMatch(false);
      onExitToLobby();
    }
  };

  if (!publicState || !privateState || !user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4">
        {syncFailed ? (
          <div className="space-y-4 max-w-sm mx-auto bg-stone-900 border border-gold-500/40 p-6 rounded-3xl shadow-xl animate-fade-in">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="text-base font-bold text-ivory-100">Synchronizing game table...</div>
            <p className="text-xs text-stone-400">
              Table cards are loading. Tap below to re-synchronize or return to table lobby.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSyncFailed(false);
                  setSyncRetries((r) => r + 1);
                  if (roomCode) syncGameState(roomCode);
                }}
                className="w-1/2 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-stone-900 text-xs font-bold transition-all shadow-gold-glow"
              >
                Re-sync Cards
              </button>
              <button
                type="button"
                onClick={onExitToLobby}
                className="w-1/2 py-2.5 rounded-xl border border-stone-600 bg-stone-800 text-stone-300 text-xs font-bold hover:bg-stone-700 transition-all"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 border-4 border-gold-500/20 border-t-gold-400 rounded-full animate-spin mb-4" />
            <div className="text-base font-bold text-ivory-100">Synchronizing game table...</div>
            <div className="text-xs text-stone-400 mt-1">Distributing 16 secret parchis securely</div>
          </>
        )}
      </div>
    );
  }

  const mySeatIndex = privateState.mySeatIndex;
  const mySeat = publicState.seats[mySeatIndex];
  const isMyTurn = publicState.activeSeat === mySeatIndex && mySeat.finishedRank === null;

  const totalSeats = publicState.seats.length;

  // Relative seating calculation around circular table:
  // Find eligible clockwise pass target for mySeat
  let passTargetSeatIndex = -1;
  for (let step = 1; step <= totalSeats; step++) {
    const nextIdx = (mySeatIndex + step) % totalSeats;
    if (publicState.seats[nextIdx].finishedRank === null) {
      passTargetSeatIndex = nextIdx;
      break;
    }
  }
  const passTargetSeat = passTargetSeatIndex !== -1 ? publicState.seats[passTargetSeatIndex] : null;

  // 4-player specific positions
  const westSeat = publicState.seats[(mySeatIndex + 1) % totalSeats];
  const northSeat = publicState.seats[(mySeatIndex + 2) % totalSeats];
  const eastSeat = publicState.seats[(mySeatIndex + 3) % totalSeats];

  // All opponents in clockwise order from mySeatIndex for dynamic N-player layouts
  const opponentsClockwise: PublicPlayerSeat[] = [];
  for (let step = 1; step < totalSeats; step++) {
    const seatIdx = (mySeatIndex + step) % totalSeats;
    opponentsClockwise.push(publicState.seats[seatIdx]);
  }

  const handleSelectCard = (card: ParchiCard) => {
    if (!isMyTurn) return;
    sound.playClick();
    setSelectedCardId(card.id === selectedCardId ? null : card.id);
  };

  const handlePassCard = () => {
    if (!selectedCardId || !isMyTurn) return;
    setPassingCardId(selectedCardId);
    passCard(selectedCardId);
    setSelectedCardId(null);
    setTimeout(() => setPassingCardId(null), 600);
  };

  const handleDeclareWin = () => {
    if (!privateState.canDeclare) return;
    sound.playDeclare();
    declareWin();
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  // Helper for rendering face-down opponent player pod
  const renderOpponentPod = (seat: PublicPlayerSeat, positionLabel: string) => {
    const isTurn = publicState.activeSeat === seat.seatIndex && seat.finishedRank === null;
    const isOpponentVip = isVipUser(seat);
    const isDuo = isDuoMember(seat);
    const isBoy = isDuoBoy(seat);

    return (
      <div
        onClick={() => {
          sound.playClick();
          setSelectedProfilePlayer(seat);
        }}
        title="Tap to view player profile & stats"
        className={`relative flex flex-col items-center transition-all p-3 rounded-2xl cursor-pointer hover:scale-105 active:scale-95 group ${
          isOpponentVip
            ? 'border-2 border-rose-500/60 bg-rose-950/20 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
            : isDuo
            ? isBoy
              ? 'border-2 border-cyan-400/80 bg-cyan-950/30 shadow-[0_0_20px_rgba(56,189,248,0.4)]'
              : 'border-2 border-rose-400/80 bg-rose-950/30 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
            : isTurn
            ? 'scale-105 ring-2 ring-gold-400 bg-gold-500/10 shadow-gold-glow'
            : 'bg-table-dark/70 border border-table-border/60 hover:border-gold-500/40'
        }`}
      >
        {/* Turn Countdown Ring if active */}
        {isTurn && (
          <div className="absolute -top-3 px-2.5 py-0.5 rounded-full bg-gold-500 text-table-dark text-[10px] font-black tracking-wider flex items-center gap-1 shadow animate-pulse">
            <Clock className="w-3 h-3" />
            <span>{displayTime}s</span>
          </div>
        )}

        {/* Finished Placement Badge */}
        {seat.finishedRank && (
          <div className="absolute -top-3 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black tracking-wider shadow">
            {seat.finishedRank === 1 ? '1st Place 🏆' : `${seat.finishedRank}th Place`}
          </div>
        )}

        {/* Win Streak Fiery Aura Tag */}
        {(seat.winStreak || 0) >= 2 && (
          <div className="absolute -top-3.5 -left-2 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-orange-600 via-amber-500 to-red-500 text-white text-[9px] font-black shadow-lg flex items-center gap-0.5 border border-amber-300 animate-bounce z-20">
            🔥 {seat.winStreak}W
          </div>
        )}

        {/* Comic Meme Speech Bubble */}
        {activeSpeech && activeSpeech.seatIndex === seat.seatIndex && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 text-stone-950 shadow-[0_4px_25px_rgba(0,0,0,0.6)] border-2 border-stone-950 font-black text-[11px] whitespace-nowrap animate-bounce flex items-center gap-1.5 max-w-[240px]">
            <span className="text-sm">🗣️</span>
            <div className="text-left">
              <span className="text-[9px] block text-stone-800 uppercase font-mono tracking-wider font-extrabold">{activeSpeech.character}</span>
              <span className="leading-tight text-stone-950 font-bold">{activeSpeech.text}</span>
            </div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-yellow-200 rotate-45 border-r border-b border-stone-950" />
          </div>
        )}

        {/* Throw Item Impact Splat Overlay */}
        {flyingThrow && flyingThrow.toSeat === seat.seatIndex && (
          <div className="absolute inset-0 z-30 flex items-center justify-center text-5xl animate-ping pointer-events-none drop-shadow-[0_0_15px_rgba(239,68,68,0.9)]">
            {flyingThrow.emoji}
          </div>
        )}

        {/* Avatar */}
        <div className="relative mb-2">
          {isOpponentVip ? (
            <div className="relative">
              <img
                src={seat.avatarUrl}
                alt={seat.displayName}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-rose-400 object-cover bg-stone-900 shadow-[0_0_16px_rgba(244,63,94,0.8)] animate-heartbeat-3d"
              />
              <span className="absolute -top-2 -right-1 text-xs animate-bounce pointer-events-none">💖</span>
            </div>
          ) : isDuo ? (
            <div className="relative">
              <img
                src={seat.avatarUrl}
                alt={seat.displayName}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover bg-stone-900 border-2 ${
                  isBoy
                    ? 'border-cyan-300 shadow-[0_0_16px_rgba(56,189,248,0.7)]'
                    : 'border-pink-300 shadow-[0_0_16px_rgba(244,63,94,0.7)]'
                }`}
              />
              <span className="absolute -top-2 -right-1 text-xs animate-bounce pointer-events-none">
                {isBoy ? '🛡️' : '👑'}
              </span>
            </div>
          ) : (
            <img
              src={seat.avatarUrl}
              alt={seat.displayName}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-gold-400/50 object-cover bg-emerald-950 shadow-md"
            />
          )}
          {seat.isBot && (
            <div className="absolute -bottom-1 -right-1 p-0.5 rounded-md bg-cyan-900 border border-cyan-400 text-cyan-200">
              <Bot className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Name */}
        <div className="text-center max-w-[110px]">
          <div className="text-xs font-bold text-ivory-100 truncate">{seat.displayName}</div>
          <div className="text-[10px] text-stone-400 font-mono">Seat {seat.seatIndex + 1}</div>
        </div>

        {/* Face-Down Secret Cards (Never reveals actual identity!) */}
        <div className="flex items-center -space-x-3 mt-2">
          {Array.from({ length: seat.cardCount }).map((_, i) => (
            <div
              key={i}
              className="w-6 h-9 sm:w-7 sm:h-11 rounded-md border border-amber-700/60 bg-gradient-to-br from-[#8a5725] to-[#42250d] shadow-sm transform -rotate-3 flex items-center justify-center text-[9px] text-gold-300 font-serif font-black select-none"
              title="Secret Face-down Parchi"
            >
              16
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 pb-24 select-none">
      {/* Top Game Bar */}
      <div className="flex items-center justify-between bg-table-surface/90 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-table-border shadow-md gap-2">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-mono text-gold-400 font-bold text-xs sm:text-sm tracking-wider">
              {publicState.roomCode}
            </span>
            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded bg-black/40 text-stone-400 font-mono">
              <span className="sm:hidden">R{publicState.roundNumber}·T{publicState.turnNumber}</span>
              <span className="hidden sm:inline">Round {publicState.roundNumber} • Turn {publicState.turnNumber}</span>
            </span>
            {publicState.matchBet && (
              <span className="hidden lg:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold">
                <span>🔥 Shart:</span>
                <span className="capitalize">{publicState.matchBet === 'custom' && publicState.customBetText ? publicState.customBetText : publicState.matchBet.replace('_', ' ')}</span>
              </span>
            )}
          </div>
        </div>

        {/* Active Turn Announcement */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-center overflow-hidden">
          {publicState.status === 'FINISHED' ? (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 text-[11px] sm:text-xs font-bold shadow animate-pulse truncate">
              <Trophy className="w-3.5 h-3.5 shrink-0 text-gold-300" />
              <span>Match Concluded! Opening Rankings...</span>
            </div>
          ) : isMyTurn ? (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-gold-500/20 border border-gold-500/50 text-gold-300 text-[11px] sm:text-xs font-bold shadow-gold-glow animate-pulse truncate">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">YOUR TURN ({displayTime}s)</span>
              <span className="hidden sm:inline">YOUR TURN TO PASS A PARCHI! ({displayTime}s)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-stone-400 font-semibold truncate">
              <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">{publicState.seats[publicState.activeSeat]?.displayName} ({displayTime}s)</span>
                <span className="hidden sm:inline">{publicState.seats[publicState.activeSeat]?.displayName}'s turn ({displayTime}s)</span>
              </span>
            </div>
          )}
        </div>

        {/* Chat, Taunts, Mute & Leave Match Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Meme Taunt Audio Mute Toggle */}
          <button
            onClick={handleToggleTauntMute}
            title={isTauntMuted ? 'Unmute Meme Voice Taunts' : 'Mute Meme Voice Taunts'}
            className="p-2 rounded-xl bg-table-card border border-table-border text-stone-300 hover:text-gold-400 transition-colors"
          >
            {isTauntMuted ? (
              <VolumeX className="w-4 h-4 text-stone-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-gold-400" />
            )}
          </button>

          {/* Meme Taunts & Throw Reactions Drawer Trigger */}
          <button
            onClick={() => {
              sound.unlock();
              sound.playClick();
              setShowTauntDrawer(!showTauntDrawer);
            }}
            title="Open Meme Voice Taunts & Animated Throw Items"
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 border border-gold-400/60 text-gold-300 hover:text-gold-100 hover:scale-105 active:scale-95 transition-all shadow flex items-center gap-1.5 text-xs font-black cursor-pointer"
          >
            <span className="text-sm">🎭</span>
            <span className="hidden sm:inline">Taunts</span>
          </button>

          {/* Chat Toggle Button */}
          <button
            onClick={() => setShowChat(!showChat)}
            className="p-2 rounded-xl bg-table-card border border-table-border text-stone-300 hover:text-gold-400 transition-colors relative"
          >
            <MessageSquare className="w-4 h-4" />
            {chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-gold-400" />
            )}
          </button>

          {/* Back / Leave Match Button */}
          <button
            onClick={() => {
              sound.playClick();
              if (publicState.status === 'ACTIVE' && mySeat.finishedRank === null) {
                setShowLeaveConfirm(true);
              } else {
                handleConfirmLeaveMatch();
              }
            }}
            title="Leave Match & Return Back"
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 hover:bg-rose-900/70 hover:border-rose-400 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>

      {/* Dynamic Duo Presence Ribbon when both Ayush & Palak are at the table */}
      {publicState.seats.some((s) => isDuoBoy(s)) &&
        publicState.seats.some((s) => isDuoGirl(s)) && (
          <div className="mt-2 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-950/80 via-purple-950/80 to-rose-950/80 border border-amber-400/50 text-amber-200 text-xs font-black shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse">
              <span className="text-sm">🤝</span>
              <span>Cosmic Dynamic Duo in Match • Ayush & Palak</span>
              <span className="text-xs bg-rose-500/40 px-2 py-0.5 rounded-full font-mono text-pink-100">
                Bond Active 💖
              </span>
            </div>
          </div>
        )}

      {/* Main Playing Table Felt */}
      <div className="relative my-4 flex-1 flex flex-col justify-between items-center rounded-[40px] sm:rounded-[60px] table-felt p-4 sm:p-8 min-h-[460px] sm:min-h-[520px]">
        {/* Table Center Felt Crest */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-full border border-gold-500/20 bg-emerald-950/40 flex flex-col items-center justify-center text-center opacity-60">
            <Crown className="w-12 h-12 text-gold-400/40 mb-1" />
            <span className="font-serif font-black text-sm tracking-widest text-gold-200/50">
              {totalSeats * 4} PARCHI
            </span>
            <span className="text-[10px] font-mono text-emerald-400/60 uppercase">
              Clockwise Table
            </span>
          </div>
        </div>

        {/* Animated Flying Throw Projectile Across Felt */}
        {flyingThrow && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="text-6xl animate-bounce drop-shadow-[0_0_25px_rgba(245,158,11,0.9)] scale-125 transition-transform duration-500">
              {flyingThrow.emoji}
            </div>
          </div>
        )}

        {/* Transfer Notification in center of table */}
        {publicState.lastTransfer && (
          <div className="z-15 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-gold-500/30 text-[11px] font-mono text-gold-300 animate-fade-in shadow-md mb-2">
            <span>{publicState.seats[publicState.lastTransfer.fromSeat]?.displayName}</span>
            <ArrowRight className="w-3 h-3 text-gold-400" />
            <span>{publicState.seats[publicState.lastTransfer.toSeat]?.displayName}</span>
          </div>
        )}

        {/* Dynamic Opponent Seating Layout */}
        {totalSeats === 4 ? (
          <>
            {/* NORTH: Opponent Across (Seat +2) */}
            <div className="z-10">{renderOpponentPod(northSeat, 'North')}</div>

            {/* MIDDLE ROW: WEST & EAST OPPONENTS */}
            <div className="w-full flex items-center justify-between px-2 sm:px-8 z-10">
              {/* WEST: Clockwise Target (Seat +1) */}
              <div className="flex flex-col items-center">
                {passTargetSeat?.seatIndex === westSeat.seatIndex && (
                  <div className="text-[10px] font-mono text-gold-400/80 mb-1 flex items-center gap-1 font-bold">
                    <span>Pass Target</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
                {renderOpponentPod(westSeat, 'West')}
              </div>

              {/* EAST: Clockwise Sender (Seat +3) */}
              <div className="flex flex-col items-center">
                {passTargetSeat?.seatIndex === eastSeat.seatIndex && (
                  <div className="text-[10px] font-mono text-gold-400/80 mb-1 flex items-center gap-1 font-bold">
                    <span>Pass Target</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
                {renderOpponentPod(eastSeat, 'East')}
              </div>
            </div>
          </>
        ) : (
          /* N > 4 players: Opponent Gallery Rail */
          <div className="w-full flex items-center justify-center gap-3 sm:gap-6 flex-wrap z-10 px-2 my-2">
            {opponentsClockwise.map((seat) => (
              <div key={seat.seatIndex} className="flex flex-col items-center">
                {seat.seatIndex === passTargetSeat?.seatIndex && (
                  <div className="text-[10px] font-mono text-gold-400 mb-1 flex items-center gap-1 font-bold animate-pulse">
                    <span>Pass Target</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
                {renderOpponentPod(seat, `Seat ${seat.seatIndex + 1}`)}
              </div>
            ))}
          </div>
        )}

        {/* SOUTH: YOU (The Player's interactive Hand) */}
        <div className="z-20 w-full flex flex-col items-center">
          {/* Action Callout if can declare */}
          {privateState.canDeclare && mySeat.finishedRank === null && (
            <div className="mb-3 animate-bounce">
              <button
                onClick={handleDeclareWin}
                className="gold-gradient-btn px-4 sm:px-8 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-base font-black shadow-gold-glow flex items-center gap-2 border-2 border-white ring-4 ring-gold-400/50"
              >
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 fill-current text-table-dark shrink-0" />
                <span>🎉 DECLARE {totalSeats * 4} PARCHI!</span>
              </button>
            </div>
          )}

          {/* Finished placement celebration banner if user already won/finished */}
          {mySeat.finishedRank && (
            <div
              className={`mb-3 px-4 sm:px-6 py-2.5 rounded-2xl font-serif font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl border ${
                mySeat.finishedRank <= 3
                  ? 'bg-gradient-to-r from-amber-500 via-gold-400 to-amber-500 text-table-dark border-white shadow-gold-glow animate-bounce'
                  : 'bg-emerald-700/90 text-white border-emerald-400/50'
              }`}
            >
              <Trophy className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${mySeat.finishedRank <= 3 ? 'text-table-dark' : 'text-gold-300'}`} />
              <span>
                {mySeat.finishedRank <= 3 ? '🎉 4 PARCHI COMPLETE! YOU FINISHED IN ' : 'YOU FINISHED IN '}
                {mySeat.finishedRank === 1
                  ? '1ST PLACE 🏆'
                  : mySeat.finishedRank === 2
                  ? '2ND PLACE 🥈'
                  : mySeat.finishedRank === 3
                  ? '3RD PLACE 🥉'
                  : `${mySeat.finishedRank}TH PLACE`}
                !
              </span>
            </div>
          )}

          {/* Comic Meme Speech Bubble for Me */}
          {activeSpeech && activeSpeech.seatIndex === mySeatIndex && (
            <div className="mb-2 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 text-stone-950 shadow-[0_4px_25px_rgba(0,0,0,0.6)] border-2 border-stone-950 font-black text-xs whitespace-nowrap animate-bounce flex items-center gap-1.5 z-30">
              <span className="text-sm">🗣️</span>
              <div className="text-left">
                <span className="text-[9px] block text-stone-800 uppercase font-mono tracking-wider font-extrabold">{activeSpeech.character} (You)</span>
                <span className="leading-tight text-stone-950 font-bold">{activeSpeech.text}</span>
              </div>
            </div>
          )}

          {/* Throw Item Impact Splat on Me */}
          {flyingThrow && flyingThrow.toSeat === mySeatIndex && (
            <div className="mb-2 flex items-center justify-center text-5xl animate-ping pointer-events-none drop-shadow-[0_0_20px_rgba(239,68,68,0.9)] z-30">
              {flyingThrow.emoji}
            </div>
          )}

          {/* Win Streak Tag for Me */}
          {(mySeat.winStreak || 0) >= 2 && (
            <div className="mb-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-600 via-amber-500 to-red-500 text-white text-[10px] font-black shadow-lg flex items-center gap-1 border border-amber-300 animate-pulse">
              <span>🔥 ACTIVE STREAK:</span>
              <span>{mySeat.winStreak} CONSECUTIVE WINS</span>
            </div>
          )}

          {/* Your 4 Parchis */}
          <div
            className={`flex items-center justify-center gap-1.5 sm:gap-4 flex-wrap max-w-full px-2 py-2 rounded-3xl transition-all ${
              mySeat.finishedRank !== null && mySeat.finishedRank <= 3
                ? 'ring-2 ring-gold-400/70 bg-gold-500/10 shadow-[0_0_35px_rgba(245,158,11,0.35)] animate-pulse'
                : ''
            }`}
          >
            {privateState.myHand.map((card) => {
              const isSelected = selectedCardId === card.id;
              const isPassing = passingCardId === card.id;
              const isWinningCard = mySeat.finishedRank !== null && mySeat.finishedRank <= 3;

              return (
                <Card
                  key={card.id}
                  card={card}
                  isSelected={isSelected || isWinningCard}
                  isPassing={isPassing}
                  onClick={() => handleSelectCard(card)}
                  disabled={!isMyTurn || mySeat.finishedRank !== null}
                />
              );
            })}
          </div>

          {/* Pass Action Button Bar */}
          {mySeat.finishedRank === null && (
            <div className="mt-3 sm:mt-4 flex items-center justify-center gap-3 w-full px-2">
              {isMyTurn ? (
                <button
                  disabled={!selectedCardId}
                  onClick={handlePassCard}
                  className={`w-full sm:w-auto px-5 sm:px-8 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg ${
                    selectedCardId
                      ? 'gold-gradient-btn shadow-gold-glow hover:scale-105 active:scale-95 animate-pulse'
                      : 'bg-table-card border border-table-border text-stone-400'
                  }`}
                >
                  <Send className="w-4 h-4 shrink-0" />
                  <span>
                    {selectedCardId ? (
                      <>
                        <span className="sm:hidden">
                          Pass to {passTargetSeat ? passTargetSeat.displayName.split(' ')[0] : 'Next'} ({displayTime}s)
                        </span>
                        <span className="hidden sm:inline">
                          Pass Selected Slip to {passTargetSeat ? passTargetSeat.displayName : 'Next Player'} ({displayTime}s)
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="sm:hidden">👆 Tap a parchi above to pass</span>
                        <span className="hidden sm:inline">👆 Tap an unwanted parchi above to pass</span>
                      </>
                    )}
                  </span>
                </button>
              ) : (
                <div className="w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-2xl bg-table-dark/80 border border-table-border text-[11px] sm:text-xs text-stone-300 font-semibold flex items-center justify-center gap-2 shadow text-center">
                  <Clock className="w-3.5 h-3.5 text-gold-400 animate-spin shrink-0" />
                  <span className="truncate">
                    Waiting for {publicState.seats[publicState.activeSeat]?.displayName} to pass...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Live Table Chat Drawer / Side Panel */}
      {showChat && (
        <div className="fixed bottom-16 inset-x-2 sm:inset-x-auto sm:right-8 z-40 sm:w-80 bg-table-surface border border-table-border rounded-3xl shadow-2xl p-4 flex flex-col h-80">
          <div className="flex items-center justify-between border-b border-table-border pb-2 mb-2">
            <div className="text-xs font-bold text-ivory-100 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-gold-400" />
              <span>Table Chat & Logs</span>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="text-stone-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {publicState.logs.slice(0, 5).map((log) => (
              <div key={log.id} className="text-[11px] text-stone-400 italic">
                • {log.text}
              </div>
            ))}

            {chatMessages.map((msg) => (
              <div key={msg.id} className="p-2 rounded-xl bg-table-card border border-table-border">
                <div className="text-[10px] font-bold text-gold-300">{msg.displayName}</div>
                <div className="text-ivory-100 mt-0.5">{msg.message}</div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendChat} className="mt-2 flex gap-1.5">
            <input
              type="text"
              placeholder="Quick reaction..."
              maxLength={60}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl bg-table-card border border-table-border text-xs text-ivory-100 focus:outline-none focus:border-gold-400"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-gold-500 text-table-dark hover:bg-gold-400 font-bold"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Meme Taunts & Animated Throw Drawer / Popover */}
      {showTauntDrawer && (
        <div className="fixed bottom-16 inset-x-2 sm:inset-x-auto sm:right-8 z-40 sm:w-96 bg-table-surface border-2 border-gold-500/60 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.8)] p-4 flex flex-col max-h-[460px] animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-table-border pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎭</span>
              <span className="text-sm font-serif font-black text-ivory-100">Desi Taunts & Reactions</span>
            </div>
            <button
              onClick={() => setShowTauntDrawer(false)}
              className="p-1 rounded-lg text-stone-400 hover:text-white text-xs hover:bg-stone-800 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-2 mb-3 bg-table-card p-1 rounded-2xl border border-table-border">
            <button
              onClick={() => {
                sound.playClick();
                setTauntTab('voice');
              }}
              className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tauntTab === 'voice'
                  ? 'bg-gold-500 text-table-dark shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span>🗣️ Meme Voices</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setTauntTab('throw');
              }}
              className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tauntTab === 'throw'
                  ? 'bg-gold-500 text-table-dark shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span>🎯 Throw Items</span>
            </button>
          </div>

          {/* Tab 1: Voice Meme Taunts */}
          {tauntTab === 'voice' && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[300px]">
              <div className="text-[10px] text-stone-400 uppercase font-mono px-1">
                Tap to speak across the table:
              </div>
              {VOICE_TAUNTS.map((taunt) => (
                <button
                  key={taunt.id}
                  onClick={() => handleSendVoiceTaunt(taunt.id)}
                  className="w-full p-2.5 rounded-2xl bg-table-card hover:bg-gold-500/10 border border-table-border hover:border-gold-400/50 transition-all text-left flex items-center justify-between group active:scale-95 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                      {taunt.emoji}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-bold text-ivory-100 group-hover:text-gold-300">
                        {taunt.label}
                      </div>
                      <div className="text-[10px] text-stone-400 truncate">
                        "{taunt.dialogue}"
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-stone-400 shrink-0 ml-2">
                    {taunt.character}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Tab 2: Throw Reactions */}
          {tauntTab === 'throw' && (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]">
              {/* Optional Target Opponent Selector */}
              <div>
                <label className="text-[10px] text-stone-400 uppercase font-mono block mb-1">
                  Target Opponent:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {publicState.seats
                    .filter((s) => s.seatIndex !== mySeatIndex)
                    .map((s) => (
                      <button
                        key={s.seatIndex}
                        onClick={() => setSelectedThrowTarget(s.seatIndex)}
                        className={`p-1.5 rounded-xl text-center border text-[11px] font-bold truncate transition-all cursor-pointer ${
                          (selectedThrowTarget === s.seatIndex ||
                            (selectedThrowTarget === null && s.seatIndex === passTargetSeatIndex))
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-table-card border-table-border text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {s.displayName.split(' ')[0]}
                      </button>
                    ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {THROW_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSendThrow(item.id)}
                    className="p-3 rounded-2xl bg-table-card hover:bg-rose-500/10 border border-table-border hover:border-rose-400/50 transition-all text-center flex flex-col items-center justify-center gap-1 group active:scale-95 cursor-pointer"
                  >
                    <span className="text-3xl group-hover:scale-125 transition-transform">
                      {item.emoji}
                    </span>
                    <span className="text-xs font-bold text-ivory-100 group-hover:text-rose-300">
                      {item.label}
                    </span>
                    <span className="text-[9px] text-stone-400 uppercase font-mono">
                      Throw SFX
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Leave Match Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-table-surface border border-rose-500/40 p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-black text-ivory-100">Leave Active Match?</h3>
              <p className="text-xs text-stone-400 mt-1">
                Leaving now will forfeit your active turn and hand your seat to an AI Bot.
              </p>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowLeaveConfirm(false);
                }}
                disabled={leavingMatch}
                className="w-1/2 py-2.5 rounded-xl border border-table-border bg-table-card text-stone-300 text-xs font-bold hover:bg-white/5 transition-colors"
              >
                Stay in Match
              </button>
              <button
                type="button"
                onClick={handleConfirmLeaveMatch}
                disabled={leavingMatch}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-colors disabled:opacity-50"
              >
                {leavingMatch ? 'Leaving...' : 'Leave Match'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Opponent & Player Profile Modal */}
      <UserProfileModal
        isOpen={Boolean(selectedProfilePlayer)}
        onClose={() => setSelectedProfilePlayer(null)}
        target={
          selectedProfilePlayer
            ? {
                id: selectedProfilePlayer.userId,
                userId: selectedProfilePlayer.userId,
                username: selectedProfilePlayer.username,
                displayName: selectedProfilePlayer.displayName,
                avatarUrl: selectedProfilePlayer.avatarUrl,
                isBot: selectedProfilePlayer.isBot,
                isVipUser: isVipUser(selectedProfilePlayer),
              }
            : null
        }
      />
    </div>
  );
};
